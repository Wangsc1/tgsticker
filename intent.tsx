import { Intent, Notification, Script } from 'scripting'
import { importSharedZIPs } from './importer'

async function notifySuccess(body: string) {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  try {
    await Notification.schedule({
      title: 'TG 表情导入', body, silent: true, tapAction: 'none',
      userInfo: { tgImportSuccess: token },
    })
  } catch (error) {
    console.warn(`无法发送导入通知：${String(error)}`)
    return
  }

  await new Promise<void>(resolve => setTimeout(resolve, 3000))
  try {
    const pending = await Notification.getAllPendingsOfCurrentScript()
    const ids = pending.filter(request => request.content.userInfo?.tgImportSuccess === token).map(request => request.identifier)
    if (ids.length) await Notification.removePendings(ids)
  } catch (error) {
    console.warn(`无法取消待送达的导入通知：${String(error)}`)
  }
  try {
    const delivered = await Notification.getAllDeliveredsOfCurrentScript()
    const ids = delivered.map(item => item.request).filter(request => request.content.userInfo?.tgImportSuccess === token).map(request => request.identifier)
    if (ids.length) await Notification.removeDelivereds(ids)
  } catch (error) {
    console.warn(`无法撤回导入通知：${String(error)}`)
  }
}

async function main() {
  let result: string
  try {
    const imported = await importSharedZIPs(Intent.fileURLsParameter ?? [])
    result = imported.message
    console.log(result)
    if (imported.success && imported.saved > 0) {
      await notifySuccess(`已导入 ${imported.saved} 张 · ${imported.breakdown}`)
    }
  } catch (error) {
    result = `导入失败：${String(error)}`
    console.warn(result)
  }
  Script.exit(Intent.text(result))
}

void main()
