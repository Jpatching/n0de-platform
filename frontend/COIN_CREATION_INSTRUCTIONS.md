# PV3 Coin Creation Instructions

## Overview
This guide will help you create accurate 3D coins matching the reference image exactly using Blender MCP.

## Key Requirements from Reference Image
1. **Color**: Bright orange/red emission (#FF6B35) with intense glow
2. **Spartan Helmet**: Right-facing profile with prominent mohawk plume
3. **Sun Design**: 8 curved spiral rays with clockwise rotation
4. **Material**: Glowing emission shader (NOT metallic)
5. **Edge**: Ridged/milled edge detail
6. **Lighting**: Dark background with blue accent rim lighting

## Step-by-Step Instructions

### 1. Connect Blender MCP to Claude
1. Open Blender
2. Go to Edit > Preferences > Add-ons
3. Install `/mnt/c/Users/ALSK/PV3/blender-mcp/addon.py`
4. Enable "Interface: Blender MCP"
5. In 3D View sidebar (N key) > BlenderMCP tab
6. Click "Connect to Claude"

### 2. Execute the Coin Creation Script
Once connected, use the following MCP command:

```python
# Execute the complete coin creation script
execute_blender_code("""
# [Paste the entire contents of create_accurate_coins.py here]
""")
```

### 3. Verify the Results
The script will create:
- **Spartan_Coin**: With right-facing helmet and mohawk plume
- **Sun_Coin**: With 8 curved spiral rays
- Both coins will have bright orange emission material
- Proper lighting setup with blue rim light

### 4. Export the Coins
After creation, export each coin separately:

```python
# Export Spartan coin
execute_blender_code("""
import bpy
# Select only Spartan coin and its children
bpy.ops.object.select_all(action='DESELECT')
spartan_coin = bpy.data.objects.get('Spartan_Coin')
if spartan_coin:
    spartan_coin.select_set(True)
    for child in spartan_coin.children:
        child.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath='/mnt/c/Users/ALSK/PV3/pv3-demo/public/models/coin-heads.glb',
        export_selected=True,
        export_apply=True
    )
""")

# Export Sun coin
execute_blender_code("""
import bpy
# Select only Sun coin and its children
bpy.ops.object.select_all(action='DESELECT')
sun_coin = bpy.data.objects.get('Sun_Coin')
if sun_coin:
    sun_coin.select_set(True)
    for child in sun_coin.children:
        child.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath='/mnt/c/Users/ALSK/PV3/pv3-demo/public/models/coin-tails.glb',
        export_selected=True,
        export_apply=True
    )
""")
```

### 5. Alternative: Manual Adjustments
If the coins need fine-tuning:

#### Adjust Emission Intensity:
```python
execute_blender_code("""
import bpy
mat = bpy.data.materials.get('Coin_Emission_Orange')
if mat and mat.use_nodes:
    emission = mat.node_tree.nodes.get('Emission')
    if emission:
        emission.inputs['Strength'].default_value = 15.0  # Increase glow
""")
```

#### Adjust Spiral Curve:
```python
execute_blender_code("""
# Modify spiral amount for more/less curve
spiral_amount = 0.8  # Increase for more spiral
# Re-run sun creation with new value
""")
```

## Important Notes
1. The coins MUST have emission material, not metallic
2. The Spartan helmet must face right with visible plume
3. The sun must have exactly 8 rays with clockwise spiral
4. Export as GLB format for web compatibility
5. Check that emission strength is high (10-15) for proper glow

## Troubleshooting
- If coins appear too dark: Increase emission strength
- If helmet is wrong direction: Check profile points orientation
- If sun rays are wrong: Verify spiral_amount and angle calculations
- If export fails: Ensure all modifiers are applied first

## Reference Comparison
After creation, compare with reference image:
- Orange glow should be vibrant (#FF6B35)
- Helmet plume should be prominent
- Sun rays should spiral clockwise
- Edge should have ridged detail
- Background should be dark with blue accent