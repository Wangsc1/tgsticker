import { Dialog, Script } from 'scripting'
import { showImporter } from './import-view'

async function main() {
  try {
    if (typeof Script.requestAccess === 'function') {
      await Script.requestAccess(['fileSystem', 'photos'])
    }
    await showImporter()
  } catch (error) {
    await Dialog.alert({ title: 'TG 表情导入', message: String(error) })
  } finally {
    Script.exit()
  }
}

void main()
