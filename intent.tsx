import { Intent, Script } from 'scripting'
import { importSharedZIPs } from './importer'

async function main() {
  let result: string
  try {
    result = (await importSharedZIPs(Intent.fileURLsParameter ?? [])).message
  } catch (error) {
    result = `导入失败：${String(error)}`
  }
  console.log(result)
  Script.exit(Intent.text(result))
}

void main()
