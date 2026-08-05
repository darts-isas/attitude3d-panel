# 姿勢補完: 遅延ベース内挿の設計案(保留)

## ステータス
未採用。まず Catch-up Blend(`interpCatchUpMs`、`src/components/Attitude3DPanel.tsx` の
`applyInterpolatedRotations`)のみを実装し、その結果を見てからこの案を採用するか判断する。

## 課題

現在の実装(`applyInterpolatedRotations`)は、`followNow`(表示レンジが相対 `now` 指定)の場合、
毎フレーム次のように目標時刻を計算する。

```ts
const target = st.timeRangeToMs + (Date.now() - dataArrivedAt.current)
```

`timeRangeToMs` はほぼ「データ到着時点の現在時刻」に等しいため、データ到着直後から `target` は
ほぼ即座にバッファ内の最新サンプル時刻を超え、`sampleQuaternionAt` は直近2サンプルが示す角速度を
一定とみなして外挿し続ける。つまり、リフレッシュ間のほとんどの時間は「確定した2点間の内挿」ではなく
「直近レートのままの外挿」になっている。

このため、物体の姿勢変化レート(角速度)がリフレッシュ間で変化するケース(加速・減速・反転など)では、
外挿中に想定していたレートと実際のレートがずれ、次の実データ到着時に外挿の基準(直近2点)が切り替わって
姿勢が不連続にスナップする。

## 設計案: 描画を約1リフレッシュ分遅延させる

利用ケースでは「APIが毎リフレッシュその瞬間の姿勢を返す」ことが前提のため、描画時刻を意図的に
約1リフレッシュ分遅らせることで、通常時は常に確定済みの2点間の内挿(安全・正確)にできる。
リフレッシュが遅延した場合のみ、既存の外挿ロジックにフォールバックする。

遅延量は新しいUI設定を追加せず、そのオブジェクトのバッファ内、直近2サンプルの時刻差
(`tLast - tPrev`)を実測値として使う。

```ts
const buffer = entry.quatBuffer
const n = buffer.length
let target = st.timeRangeToMs
if (st.followNow && n > 0) {
  const tLast = buffer[n - 1].t
  const delay = n >= 2 ? tLast - buffer[n - 2].t : 0
  target = tLast - delay + (now - dataArrivedAt.current)
}
```

### 挙動の確認
- リフレッシュ直後(`now - dataArrivedAt ≈ 0`): `target ≈ tLast - delay` = 前回のサンプル時刻
  → 内挿区間の開始点(u≈0)。
- 次のリフレッシュ直前(`now - dataArrivedAt ≈ delay`): `target ≈ tLast` = 内挿区間の終端(u≈1)。
- 新データが届くと `tLast`・`dataArrivedAt` が更新され、`target` は新しい内挿区間の開始点に
  自然に戻る → 継続的でスナップが起きにくい。
- リフレッシュが想定より遅れた場合のみ `target` が `tLast` を超え、外挿にフォールバックする。

### Catch-up Blend との関係
この設計を採用しても、外挿からの復帰(リフレッシュ遅延からの回復)時のスナップは依然として起こりうるため、
Catch-up Blend(`interpCatchUpMs`)は引き続き有効。両者は独立に組み合わせられる。

### 未解決の論点
- リフレッシュ間隔が不安定(ジッター)な場合、直近1つのgapだけを遅延量として使うとノイズに弱い可能性がある
  (直近数gapの中央値/平均を使うなどの改善余地がある)。
- `interpBufferSize` が2のままだと、遅延量の推定に使える履歴が1区間分しかない。
