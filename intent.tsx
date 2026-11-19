import { Intent, Notification, Script } from 'scripting'
import { importSharedZIPs } from './importer'

async function notify(body: string) {
  try {
    await Notification.schedule({ title: 'TG 表情导入', body, silent: true, tapAction: 'none' })
  } catch (error) {
    console.warn(`无法发送导入通知：${String(error)}`)
  }
}

async function main() {
  let result: string
  let summary: string
  try {
    const paths = Intent.fileURLsParameter ?? []
    if (paths.length) await notify('正在导入，请稍候。')
    const imported = await importSharedZIPs(paths)
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
  await notify(summary)
  Script.exit(Intent.text(result))
}

void main()
