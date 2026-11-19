const MAX_ZIP_BYTES = 60_000_000

export type ImportProgress =
  | { phase: 'extracting'; file: string }
  | { phase: 'saving'; file: string; processed: number; total: number }

async function importArchive(source: string, file: string, report: (progress: ImportProgress) => void) {
  if (typeof Archive === 'undefined' || typeof Archive.extractZip !== 'function') {
    throw new Error('当前 Scripting 版本不支持 ZIP 解压接口，请更新 Scripting。')
  }
  const sharedSize = await FileManager.stat(source).then(stat => stat.size, () => undefined)
  if (typeof sharedSize === 'number' && sharedSize > MAX_ZIP_BYTES) {
    throw new Error('ZIP 超过 60 MB。')
  }

  const root = `${FileManager.temporaryDirectory}/tg-zip-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const localZIP = `${root}/input.zip`
  const output = `${root}/images`
  await FileManager.createDirectory(root)
  try {
    let size: number
    try {
      await FileManager.copyFile(source, localZIP)
      size = (await FileManager.stat(localZIP)).size
    } catch (error) {
      throw new Error(`无法读取 ZIP：${String(error)}`)
    }
    if (!Number.isFinite(size) || size <= 0) throw new Error('无法读取 ZIP：文件为空或无法取得大小。')
    if (size > MAX_ZIP_BYTES) throw new Error('ZIP 超过 60 MB。')
    const extracted = await Archive.extractZip({
      sourcePath: localZIP,
      destinationPath: output,
      maxEntries: 512,
      maxEntryUncompressedBytes: 20_000_000,
      maxUncompressedBytes: 100_000_000,
    })
    const entries = Archive.openForMode(localZIP, 'read').getEntryPaths()
    const names = [...new Set(entries.map(name => name.replace(/^(?:\.\/)+/, '')))]
      .filter(name => /\.(?:jpe?g|gif)$/i.test(name) &&
        name.split('/').every(part => part && !part.startsWith('.') && !/[\\:\x00-\x1f]/.test(part)))
      .sort()
    if (!names.length) {
      throw new Error(`解压了 ${extracted.entryCount} 个条目，但 ZIP 中没有可导入的 JPG、JPEG 或 GIF。`)
    }
    let images = 0, gifs = 0, failed = 0
    let firstFailure = ''
    report({ phase: 'saving', file, processed: 0, total: names.length })
    for (const [index, name] of names.entries()) {
      const path = `${output}/${name}`
      try {
        if (!await Photos.savePhoto(path)) throw new Error('照片未接受该文件，请检查照片权限。')
        if (/\.gif$/i.test(name)) gifs++
        else images++
      } catch (error) {
        failed++
        if (!firstFailure) firstFailure = `${name}：${String(error)}`
      }
      report({ phase: 'saving', file, processed: index + 1, total: names.length })
    }
    return { images, gifs, failed, firstFailure }
  } finally {
    try {
      await FileManager.remove(root)
    } catch (error) {
      console.warn(`临时目录清理失败：${String(error)}`)
    }
  }
}

function localPath(value: string) {
  if (value.startsWith('/')) return value
  const match = /^file:\/\/(?:localhost)?(\/[^?#]*)$/i.exec(value)
  if (!match) return ''
  try {
    return decodeURIComponent(match[1])
  } catch {
    return ''
  }
}

export async function importSharedZIPs(values: readonly string[], report: (progress: ImportProgress) => void = () => {}) {
  const paths = [...new Set(values.map(localPath).filter(path => /\.zip$/i.test(path)))]
  if (!paths.length) return { message: '没有收到 ZIP 文件。请在 Telegram 的 ZIP 预览页打开系统分享菜单。', saved: 0, breakdown: '', success: false }

  let images = 0, gifs = 0, failed = 0
  const errors: string[] = []
  const saveErrors: string[] = []
  for (const path of paths) {
    try {
      const file = path.split('/').pop() ?? path
      report({ phase: 'extracting', file })
      const result = await importArchive(path, file, report)
      images += result.images
      gifs += result.gifs
      failed += result.failed
      if (result.firstFailure) saveErrors.push(result.firstFailure)
    } catch (error) {
      errors.push(`${path.split('/').pop()}：${String(error)}`)
    }
  }
  const saved = images + gifs
  const breakdown = `图片 ${images} 张 · GIF ${gifs} 张`
  const lines = [`已导入 ${saved} 张，保存失败 ${failed} 张。`, breakdown]
  if (saveErrors.length) lines.push('保存失败示例：', ...saveErrors)
  if (errors.length) lines.push(`${errors.length} 个 ZIP 无法处理：`, ...errors)
  return { message: lines.join('\n'), saved, breakdown, success: failed === 0 && errors.length === 0 }
}
