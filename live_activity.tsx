import { HStack, Image, LiveActivity, LiveActivityUI, LiveActivityUIExpandedCenter, Text, VStack, type LiveActivityUIBuilder } from 'scripting'

export type StickerActivityState = {
  icon: string
  status: string
  compact: string
  detail?: string
}

function ActivityContent({ icon, status, detail }: StickerActivityState) {
  return <HStack spacing={10}>
    <Image systemName={icon} />
    <VStack alignment="leading" spacing={3}>
      <Text>{status}</Text>
      {detail ? <Text font="caption" foregroundStyle="secondaryLabel">{detail}</Text> : null}
    </VStack>
  </HStack>
}

const builder: LiveActivityUIBuilder<StickerActivityState> = state => <LiveActivityUI
  content={<ActivityContent {...state} />}
  compactLeading={<Image systemName={state.icon} />}
  compactTrailing={<Text>{state.compact}</Text>}
  minimal={<Image systemName={state.icon} />}
>
  <LiveActivityUIExpandedCenter>
    <ActivityContent {...state} />
  </LiveActivityUIExpandedCenter>
</LiveActivityUI>

export const createStickerActivity = (() => {
  try {
    if (typeof LiveActivity?.register === 'function') return LiveActivity.register('TGStickerImport', builder)
  } catch (error) {
    console.warn(`无法注册实时活动：${String(error)}`)
  }
})()
