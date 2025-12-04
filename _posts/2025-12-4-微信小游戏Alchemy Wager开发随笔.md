---
layout: post
title: "微信小游戏Alchemy Wager开发随笔"
date: 2025-12-04 22:00:00 +0800
categories: [微信小游戏]
tags: [开发随笔, 技术积累]
description: 记录微信小游戏Alchemy Wager的开发过程与心得
pin: false
---

**遇到的困难与解决方法**

<div class="orders-container">
  <details class="order-card">
    <summary>1. 上传代码时显示非法文件</summary>
    <div class="content">
      <div class="reflection-item-content">
        <p>明明没问题，上传代码的时候一直显示有非法文件。</p>
        <p><strong>原因：</strong>常用的 <code>.wxml</code> 和 <code>.wxss</code> 文件，微信小程序是会使用，但微信小游戏是不支持的，所以导致非法报错。</p>
        <p><strong>背景：</strong>我一开始这个项目用的是我大一注册的微信小程序账号测试的，后来发现有问题，才又注册了一个新的微信小游戏账号，所以会遇到这个问题。</p>
        <p>类似其实还遇到一换掉 AppID 就立马编译大错误（因为要把小程序改成小游戏开发）。</p>
        <div style="display: flex; gap: 15px; margin-top: 15px;">
          <img src="https://s41.ax1x.com/2025/12/04/pZe4dzR.png" alt="错误截图" style="width: 100%; border-radius: 8px; border: 1px solid #eee;">
          <img src="https://s41.ax1x.com/2025/12/04/pZe40Q1.png" alt="修改后的成功截图" style="width: 100%; border-radius: 8px; border: 1px solid #eee;">
        </div>
      </div>
    </div>
  </details>
</div>