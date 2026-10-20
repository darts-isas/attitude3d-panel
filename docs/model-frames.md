# モデル座標系と姿勢クォータニオンの考え方

テレメトリの姿勢クォータニオンでモデルを回し、慣性座標系(J2000 など)上の姿勢を正しく表示する
ための前提と設定方法をまとめる。

## シーンの構成

```
scene
└─ world      … Up Axis の回転のみ(表示用)。world 座標 = 入力座標系(例: J2000)
   ├─ root    … Position と Quaternion (q または q⁻¹)
   │  └─ offset … Model Axis Offset (XYZ Euler)
   │     └─ モデル (GLB/GLTF の scene をノード変換ごとそのまま)
   ├─ ベクトル(矢印)… world 座標で指定
   └─ ヘルパー軸
```

- モデルとベクトルは同じ `world` の下にあるので、両者の相対的な向きは Up Axis に依存しない。
- 描画される姿勢は `(q または q⁻¹) × offset`。
- `root.quaternion` は three.js の `Object3D.quaternion` そのもので、
  **モデルのローカル座標(機体座標)のベクトルを world 座標へ回す回転**(Hamilton, 能動回転)。

## モデル(GLB)側の約束

**GLB のローカル座標 = 機体座標系(Body frame)にしておく。**

- 判定は GLB の各ノードの変換(translation / rotation / scale)をすべて適用した後の座標で行う。
  GLTFLoader はノード変換を保持するので、ルートノードに回転を入れて軸を合わせてもよい。
- glTF の慣例(+Y が上)に合わせる必要はない。機体の +Z が glTF の +Z を向いていてよい。
- 複数のモデル(打ち上げ形態・軌道上形態など)を切り替える場合は、すべて同じ機体座標で揃える。
  揃っていないと、同じクォータニオンで形態ごとに向きが変わってしまう。
- 軸がずれたモデルは、まず GLB 側(ルートノードの回転や、元データからの再エクスポート)で直す。
  GLB を直せない場合に限り Model Axis Offset で補正する。

確認方法: 機体構体座標系の図と、GLB を ±X / ±Y / +Z 方向から見た画像を見比べ、特徴的な部品
(HGA、太陽電池パドル、脚、スラスタなど)がどの軸方向の面にあるかを確かめる。

## クォータニオンの規約と Inverse

panel が必要とするのは「機体 → world」の回転。入力データの規約ごとの対応は次のとおり。

| 入力クォータニオンの定義 | Inverse |
|---|---|
| world 軸を q で回すと機体軸になる(Hamilton, 能動回転) | OFF |
| Wertz/Shuster 型の姿勢行列 `A(q) = (q4² − \|q\|²)I + 2qqᵀ − 2q4[q×]` で world 成分 → 機体成分を変換 | OFF |
| Hamilton 積で `v_B = q ⊗ v_I ⊗ q*`(受動回転) | ON |

- 「慣性系 ⇒ Body(q_IB)」でスカラーが末尾(Q4)の JAXA 系の定義は通常 Wertz 型なので Inverse OFF。
- スカラーが先頭(q0)の場合は Quaternion W に先頭成分を割り当てる。
- 規約資料が無い場合は、実データで確かめる。太陽指向中に太陽電池面の法線と Sun ベクトルが
  揃うか、SPICE の CK があれば `pxform` の結果と一致するかを見る。鏡像・逆向きになるなら Inverse を
  切り替える。

## Up Axis

world 全体を回すだけの表示用の設定で、姿勢の計算には影響しない。

- `+Y (as-is)`: 入力座標をそのまま描画(three.js の +Y が画面上)。
- `+Z`: 入力座標の +Z が画面上。J2000 で北(+Z)を上にしたい場合に使う。

## 設定例: MMX(J2000 表示)

| 項目 | 値 |
|---|---|
| Model URL | `MMX_launch.glb` / `MMX_orbit.glb` / `MMX_return.glb`(すべて GLB 座標 = 機体座標 Xs, Ys, Zs) |
| Quaternion X / Y / Z / W | `FNMQIB_Q1` / `Q2` / `Q3` / `Q4`(J2000 ⇒ Body、Q4 がスカラー) |
| Inverse | OFF |
| Model Axis Offset | 0 / 0 / 0 |
| Up Axis | `+Z` |
| Vectors | Sun / Moon / Earth は SPICE `spkpos`(frame: J2000)の差分 |

MMX のモデルでは HGA が +X 面、太陽電池パドルが ±Y、着陸脚が −Z、推進モジュールのスラスタが +Z。
`MMX_orbit.glb` と `MMX_return.glb` は元のエクスポートで Z 軸まわりに 180° 回っていたため、
ルートノード `MMX_body_frame`(Z 軸まわり 180°)を追加して `MMX_launch.glb` と揃えている。
