import { Intent, Notification, Script } from 'scripting'
import { importSharedZIPs } from './importer'

async function notify(body: string) {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    await Notification.schedule({
      title: 'TG 表情导入', body, silent: true, tapAction: 'none',
      userInfo: { tgImportNotice: token },
    })
    return token
  } catch (error) {
    console.warn(`无法发送导入通知：${String(error)}`)
  }
}

async function removeNotice(token: string) {
  try {
    const pending = await Notification.getAllPendingsOfCurrentScript()
    const ids = pending.filter(request => request.content.userInfo?.tgImportNotice === token).map(request => request.identifier)
    if (ids.length) await Notification.removePendings(ids)
  } catch (error) {
    console.warn(`无法取消待送达的导入通知：${String(error)}`)
  }
  try {
    const delivered = await Notification.getAllDeliveredsOfCurrentScript()
    const ids = delivered.map(item => item.request).filter(request => request.content.userInfo?.tgImportNotice === token).map(request => request.identifier)
    if (ids.length) await Notification.removeDelivereds(ids)
  } catch (error) {
    console.warn(`无法撤回导入通知：${String(error)}`)
  }
}

async function main() {
  const paths = Intent.fileURLsParameter ?? []
  const start = paths.length ? await notify('正在导入，请稍候。') : undefined
  let result: string
  let successBody: string | undefined
  try {
    const imported = await importSharedZIPs(paths)
    result = imported.message
    console.log(result)
    if (imported.success && imported.saved > 0) {
      successBody = `已导入 ${imported.saved} 张 · ${imported.breakdown}`
    }
  } catch (error) {
    result = `导入失败：${String(error)}`
    console.warn(result)
  }
  if (start) await removeNotice(start)
  if (successBody) {
    const success = await notify(successBody)
    if (success) {
      await new Promise<void>(resolve => setTimeout(resolve, 3000))
      await removeNotice(success)
    }
  }
  Script.exit(Intent.text(result))
}

void main()
