export const COMMENT_LIST_PATH = '/web/api/third_party/aweme/api/comment/read/aweme/v1/web/comment/list/select/';

export function requestHeadersForApi(headers) {
  return Object.fromEntries(Object.entries(headers).filter(([name]) =>
    /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) &&
    !['cookie', 'host', 'connection', 'content-length'].includes(name.toLowerCase())
  ));
}

export function isUnrepliedRequest(url) {
  try {
    const u = new URL(url);
    return u.origin === 'https://creator.douyin.com' && u.pathname === COMMENT_LIST_PATH &&
      (u.searchParams.get('comment_select_options') || '').split(',').includes('not_replied');
  } catch { return false; }
}

export function decodeCommentPage(body, awemeId) {
  if (body?.status_code === 8) throw Error('LOGIN_EXPIRED: 评论接口登录失效');
  if (body?.status_code !== 0 || ![0, 1, false, true].includes(body.has_more) || !Number.isFinite(Number(body.total)) || body.total === null || body.total === undefined) {
    throw Error('COMMENT_API_INVALID: status=' + body?.status_code + ' keys=' + Object.keys(body || {}).join(','));
  }
  if (body.comments !== null && !Array.isArray(body.comments)) throw Error('COMMENT_API_INVALID: missing comments array');
  const comments = (body.comments || []).map(c => {
    if (!c.cid || !c.user?.nickname || typeof c.text !== 'string' || !c.text.trim() || String(c.aweme_id) !== String(awemeId)) {
      throw Error('COMMENT_API_UNSUPPORTED: incomplete, media-only or mismatched comment');
    }
    return { username: c.user.nickname, commentText: c.text, commentId: String(c.cid), workId: String(awemeId) };
  });
  if (!comments.length && Number(body.total) > 0 && !body.has_more) throw Error('COMMENT_API_INVALID: nonzero total with empty final page');
  return { comments, hasMore: Boolean(body.has_more), cursor: body.cursor, total: Number(body.total) };
}

export async function fetchUnrepliedViaApi(request, templateUrl, awemeId, {limit=50, headers={}}={}) {
  if (!isUnrepliedRequest(templateUrl) || !/^\d+$/.test(String(awemeId))) throw Error('COMMENT_API_INVALID: unsafe template or work ID');
  const seen = new Set();
  const comments = [];
  let cursor = '0';
  for (let page = 0; page < 200; page++) {
    const url = new URL(templateUrl);
    url.searchParams.set('aweme_id', String(awemeId));
    url.searchParams.set('cursor', cursor);
    // Keep the observed page size and the site's own query/authentication context.
    const response = await request.get(url.href, {timeout:15000, maxRedirects:0, headers});
    if (response.status() !== 200) throw Error('COMMENT_API_HTTP: ' + response.status());
    const result = decodeCommentPage(await response.json(), awemeId);
    for (const comment of result.comments) {
      if (!seen.has(comment.commentId)) { seen.add(comment.commentId); comments.push(comment); }
    }
    if (comments.length >= limit) return {comments:comments.slice(0,limit), truncated:result.hasMore || comments.length > limit};
    if (!result.hasMore) return {comments,truncated:false};
    const next = String(result.cursor);
    if (!/^\d+$/.test(next) || next === cursor) throw Error('COMMENT_API_PAGINATION: cursor did not advance');
    cursor = next;
  }
  throw Error('COMMENT_API_PAGINATION: page budget exceeded');
}
