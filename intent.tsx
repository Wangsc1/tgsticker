import { Intent, Notification, Script } from 'scripting'
import { importSharedZIPs, type ImportProgress } from './importer'
import { createStickerActivity, type StickerActivityState } from './live_activity'

async function startActivity() {
  try {
    const activity = createStickerActivity?.()
    if (activity && await activity.start({ icon: 'photo.on.rectangle.angled', status: '正在准备导入', compact: '准备' })) {
      console.log('已启动实时活动。')
      return activity
    }
    console.warn('当前运行环境未能启动实时活动。')
  } catch (error) {
    console.warn(`无法启动实时活动：${String(error)}`)
  }
}

const notificationTitle = 'TG 表情导入'

async function notify(body: string, startToken?: string) {
  try {
    await Notification.schedule({
      title: notificationTitle, body, silent: true, tapAction: 'none',
      userInfo: startToken ? { tgImportStart: startToken } : { tgImportResult: true },
    })
  } catch (error) {
    console.warn(`无法发送导入通知：${String(error)}`)
  }
}

type NotificationContent = Awaited<ReturnType<typeof Notification.getAllPendingsOfCurrentScript>>[number]['content']

async function removeNotifications(matches: (content: NotificationContent) => boolean) {
  try {
    const pending = await Notification.getAllPendingsOfCurrentScript()
    const ids = pending.filter(request => matches(request.content)).map(request => request.identifier)
    if (ids.length) await Notification.removePendings(ids)
  } catch (error) {
    console.warn(`无法取消待送达的导入通知：${String(error)}`)
  }
  try {
    const delivered = await Notification.getAllDeliveredsOfCurrentScript()
    const ids = delivered.map(item => item.request).filter(request => matches(request.content)).map(request => request.identifier)
    if (ids.length) await Notification.removeDelivereds(ids)
  } catch (error) {
    console.warn(`无法撤回导入通知：${String(error)}`)
  }
}

function isResultNotification({ title, body, userInfo }: NotificationContent) {
  if (title !== notificationTitle) return false
  if (userInfo?.tgImportResult === true) return true
  if (userInfo?.tgImportStart || !body) return false
  // 旧版本的结果通知没有标记，只匹配已发布的固定格式。
  return /^已导入 \d+ 张 · 图片 \d+ 张 · GIF \d+ 张$/.test(body)
    || /^已导入 \d+ 张，保存失败 \d+ 张。\n图片 \d+ 张 · GIF \d+ 张\n有项目未完成，详情见 Scripting 日志。$/.test(body)
    || body === '导入失败，请查看 Scripting 日志。'
    || body === '没有收到 ZIP 文件。请在 Telegram 的 ZIP 预览页打开系统分享菜单。'
    || body === 'ZIP 中没有可导入的图片或 GIF。'
}

async function main() {
  let startToken: string | undefined
  let result: string
  let summary: string
  let finalState: StickerActivityState = { icon: 'exclamationmark.circle', status: '导入失败', compact: '失败' }
  let activity: Awaited<ReturnType<typeof startActivity>>
  let pending: Promise<void> | undefined
  let lastUpdate = 0
  const report = (progress: ImportProgress) => {
    if (!activity || pending) return
    const now = Date.now()
    if (progress.phase === 'saving' && progress.processed > 0 && now - lastUpdate < 1000) return
    lastUpdate = now
    const state: StickerActivityState = progress.phase === 'extracting'
      ? { icon: 'archivebox', status: '正在读取和解压 ZIP', compact: '解压' }
      : { icon: 'photo.on.rectangle.angled', status: `已处理 ${progress.processed} / ${progress.total} 张`, compact: `${progress.processed}/${progress.total}` }
    const current = activity
    pending = Promise.resolve().then(async () => {
      await current.update(state)
    }).catch(error => {
      console.warn(`无法更新实时活动：${String(error)}`)
    }).finally(() => { pending = undefined })
  }
  try {
    const paths = Intent.fileURLsParameter ?? []
    if (paths.length) {
      await removeNotifications(isResultNotification)
      startToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      await notify('正在导入，请稍候。', startToken)
      activity = await startActivity()
    }
    const imported = await importSharedZIPs(paths, report)
    finalState = {
      icon: imported.success ? 'checkmark.circle' : 'exclamationmark.circle',
      status: imported.saved ? `已导入 ${imported.saved} 张` : '未导入图片',
      compact: imported.saved ? `${imported.saved} 张` : '未导入',
      detail: imported.success ? imported.breakdown : '有项目未完成，详情见导入通知。',
    }
    result = imported.message
    if (!imported.breakdown) {
      summary = result
    } else if (!imported.success) {
      summary = `${result.split('\n')[0]}\n${imported.breakdown}\n有项目未完成，详情见 Scripting 日志。`
    } else {
      summary = imported.saved > 0 ? `已导入 ${imported.saved} 张 · ${imported.breakdown}` : 'ZIP 中没有可导入的图片或 GIF。'
    }
  } catch (error) {
    result = `导入失败：${String(error)}`
    summary = '导入失败，请查看 Scripting 日志。'
  }
  console.log(result)
  if (startToken) await removeNotifications(content => content.userInfo?.tgImportStart === startToken)
  await notify(summary)
  if (activity) {
    try {
      await pending
      try {
        await activity.update(finalState)
        const state = await activity.getActivityState()
        console.log(`结果已更新，实时活动状态：${state ?? '未知'}。`)
        // 结束后的 dismissTimeInterval 只保留锁屏卡片，不延长灵动岛的显示。
        if (state === 'active') await new Promise<void>(resolve => setTimeout(resolve, 10000))
      } catch (error) {
        console.warn(`无法显示实时活动结果：${String(error)}`)
      }
      await activity.end(finalState, { dismissTimeInterval: 10 })
    } catch (error) {
      console.warn(`无法结束实时活动：${String(error)}`)
    }
  }
  Script.exit(Intent.text(result))
}

void main()
