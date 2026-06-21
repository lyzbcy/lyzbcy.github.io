"""
Blender 命令行脚本：把 Unity fbx 转成 Web AR 用的 glb。
用法：
  blender --background --python convert_fbx_to_glb.py -- <fbx路径> <glb输出路径> <减面比例>

做四件事：
  1. 清空场景，导入 fbx
  2. 合并所有 mesh，居中到原点，缩放到单位立方体内
  3. Decimate 减面（按 ratio，0.5 = 砍掉一半面数）
  4. 导出单个 glb（贴图内嵌）
"""
import bpy
import sys
import os

# 解析 -- 之后的参数（blender 把 --python 后面的参数原样传进来）
argv = sys.argv
if "--" in argv:
    argv = argv[argv.index("--") + 1:]
else:
    argv = []

if len(argv) < 2:
    print("用法: blender --background --python convert_fbx_to_glb.py -- <in.fbx> <out.glb> [decimate_ratio]")
    sys.exit(1)

in_fbx = os.path.abspath(argv[0].replace('\\', '/'))
out_glb = os.path.abspath(argv[1].replace('\\', '/'))
decimate_ratio = float(argv[2]) if len(argv) > 2 else 0.5

print(f"[convert] 输入: {in_fbx}")
print(f"[convert] 输出: {out_glb}")
print(f"[convert] 减面比例: {decimate_ratio}")

# ---------- 1. 清空 + 导入 ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
# fbx 所在目录作为贴图搜索路径
fbx_dir = os.path.dirname(in_fbx)
try:
    bpy.ops.import_scene.fbx(filepath=in_fbx, directory=fbx_dir,
                             use_image_search=True)
except Exception as e:
    print(f"[convert] fbx 导入失败: {e}")
    sys.exit(2)

mesh_objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if not mesh_objs:
    print("[convert] 警告：导入后没有 mesh 对象")
    sys.exit(3)
print(f"[convert] 导入 {len(mesh_objs)} 个 mesh，总顶点 {sum(len(o.data.vertices) for o in mesh_objs)}")

# ---------- 1.5 注入贴图 ----------
# Unity 导出的 fbx 常常不带图像纹理节点（Unity 用自己的 Shader）。
# 在 fbx 同目录找 *basecolor*/*.albedo*/*.diffuse* 贴图，接到所有材质的 Base Color。
import glob
tex_candidates = []
for pat in ['*basecolor*', '*BaseColor*', '*albedo*', '*Albedo*',
            '*diffuse*', '*Diffuse*', '*_D.*', '*_C.*']:
    tex_candidates.extend(glob.glob(os.path.join(fbx_dir, pat)))
tex_candidates = list({f.lower(): f for f in tex_candidates}.values())  # 去重
if tex_candidates:
    print(f"[convert] 找到候选贴图: {[os.path.basename(t) for t in tex_candidates]}")
    # 加载第一张作为主贴图（多张时取 basecolor 优先）
    main_tex_path = tex_candidates[0]
    img = bpy.data.images.load(main_tex_path, check_existing=True)
    img.colorspace_settings.name = 'sRGB'
    tex_node_added = 0
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            mat.use_nodes = True
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not bsdf:
            continue
        # 已有图像纹理节点就复用，否则新建
        tex = next((n for n in nt.nodes if n.type == 'TEX_IMAGE' and n.image), None)
        if not tex:
            tex = nt.nodes.new('ShaderNodeTexImage')
            tex.image = img
            tex.location = (bsdf.location.x - 300, bsdf.location.y)
            nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
            tex_node_added += 1
    print(f"[convert] 已为 {tex_node_added} 个材质注入贴图 {os.path.basename(main_tex_path)}")
else:
    print("[convert] 未找到 basecolor 贴图，保持原样（可能无贴图）")

# ---------- 2. 合并 + 居中 + 归一化缩放 ----------
# 给没有材质的 mesh 补一个默认材质（否则导出后是白的/丢失）
default_mat = bpy.data.materials.new(name="AR_Default")
default_mat.use_nodes = True
for o in mesh_objs:
    if len(o.data.materials) == 0:
        o.data.materials.append(default_mat)

# 选中所有 mesh 合并成一个，方便统一处理
bpy.ops.object.select_all(action='DESELECT')
for o in mesh_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = mesh_objs[0]
if len(mesh_objs) > 1:
    bpy.ops.object.join()
merged = bpy.context.view_layer.objects.active
merged.name = "ARModel"

bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
merged.location = (0, 0, 0)

# 归一化：最大边缩放到 2 米（Blender 单位），后续 Three.js 再按需缩放
max_dim = max(merged.dimensions)
if max_dim > 0:
    scale = 2.0 / max_dim
    merged.scale = (scale, scale, scale)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ---------- 3. 减面 ----------
# 对每个 mesh 加 Decimate 修饰器并应用。ratio<1 时才减。
if decimate_ratio < 1.0:
    bpy.context.view_layer.objects.active = merged
    mod = merged.modifiers.new(name="Decimate", type='DECIMATE')
    mod.ratio = decimate_ratio
    # Blender 5.x 的 Decimate 默认就是 collapse 模式，无需设 use_collapse（该属性已移除）
    try:
        bpy.ops.object.modifier_apply(modifier=mod.name)
        print(f"[convert] 减面后顶点: {len(merged.data.vertices)}, 面: {len(merged.data.polygons)}")
    except Exception as e:
        print(f"[convert] 减面失败（跳过）: {e}")

# ---------- 4. 导出 glb ----------
# 确保输出目录存在
os.makedirs(os.path.dirname(out_glb), exist_ok=True)
try:
    bpy.ops.export_scene.gltf(
        filepath=out_glb,
        export_format='GLB',
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        export_image_format='AUTO',  # Blender 5.x：GLB 模式下贴图自动内嵌
        export_apply=True,           # 应用修饰器
        export_yup=True,             # glTF 默认 Y-up
        use_selection=False,
    )
    sz = os.path.getsize(out_glb)
    print(f"[convert] 导出成功: {out_glb} ({sz/1024:.1f} KB)")
except Exception as e:
    print(f"[convert] 导出失败: {e}")
    sys.exit(4)
