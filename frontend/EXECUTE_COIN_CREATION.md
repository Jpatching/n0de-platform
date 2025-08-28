# Quick Execution Guide for PV3 Coin Creation

## Prerequisites
1. Blender must be open
2. Blender MCP addon must be installed and connected to Claude
3. You should see "Connected to Claude" in the BlenderMCP panel

## Step 1: Clear Scene and Create Coins
Execute this in Claude using the MCP tool:

```
Use execute_blender_code with the contents of /mnt/c/Users/ALSK/PV3/create_accurate_coins.py
```

## Step 2: Verify Creation
After execution, you should see:
- Two coins in the viewport (left: Spartan, right: Sun)
- Bright orange glowing material
- Blue accent lighting from the side
- Dark background

## Step 3: Take Screenshot
To verify the coins look correct:

```
Use get_viewport_screenshot to capture the current view
```

## Step 4: Export Coins
Export each coin as a separate GLB file:

### Export Heads (Spartan):
```python
execute_blender_code("""
import bpy
import os

# Ensure export directory exists
export_dir = '/mnt/c/Users/ALSK/PV3/pv3-demo/public/models'
os.makedirs(export_dir, exist_ok=True)

# Select Spartan coin and children
bpy.ops.object.select_all(action='DESELECT')
spartan_coin = bpy.data.objects.get('Spartan_Coin')
if spartan_coin:
    spartan_coin.select_set(True)
    for child in spartan_coin.children:
        child.select_set(True)
    
    # Export as GLB
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(export_dir, 'coin-heads.glb'),
        export_selected=True,
        export_apply=True,
        export_materials='EXPORT'
    )
    print("Exported coin-heads.glb")
""")
```

### Export Tails (Sun):
```python
execute_blender_code("""
import bpy
import os

# Select Sun coin and children
bpy.ops.object.select_all(action='DESELECT')
sun_coin = bpy.data.objects.get('Sun_Coin')
if sun_coin:
    sun_coin.select_set(True)
    for child in sun_coin.children:
        child.select_set(True)
    
    # Export as GLB
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(export_dir, 'coin-tails.glb'),
        export_selected=True,
        export_apply=True,
        export_materials='EXPORT'
    )
    print("Exported coin-tails.glb")
""")
```

## Step 5: Render Preview (Optional)
To create a high-quality preview:

```python
execute_blender_code("""
import bpy

# Set camera
scene = bpy.context.scene
scene.camera = bpy.data.objects.get('Camera')

# Quick render settings
scene.render.engine = 'CYCLES'
scene.cycles.samples = 64  # Lower for faster preview
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080

# Render
bpy.ops.render.render(write_still=True)
""")
```

## Expected Results
✅ Bright orange/red glowing coins (#FF6B35)
✅ Spartan helmet facing right with mohawk plume
✅ Sun with 8 clockwise spiral rays
✅ Ridged edge detail on both coins
✅ Dark background with blue rim lighting
✅ Two GLB files exported: coin-heads.glb and coin-tails.glb

## If Coins Don't Match Reference
1. Check emission strength (should be 10-15)
2. Verify helmet is right-facing
3. Count sun rays (should be exactly 8)
4. Check spiral direction (clockwise)
5. Verify orange color (#FF6B35)