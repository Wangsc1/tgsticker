import { Dialog, Intent, Script } from 'scripting'
import { showImporter } from './import-view'

async function main() {
  let result: string
  try {
    result = await showImporter(() => Intent.fileURLsParameter ?? [])
  } catch (error) {
    result = `导入入口失败：${String(error)}`
    console.error(result)
    try {
      await Dialog.alert({ title: 'TG 表情导入', message: result })
    } catch (alertError) {
      console.error(String(alertError))
    }
  }
  Script.exit(Intent.text(result))
}

void main()
