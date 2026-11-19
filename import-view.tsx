import { Image, Navigation, ProgressView, RoundedRectangle, Script, Text, VStack, useEffect, useRef, useState } from 'scripting'
import { importSharedZIPs } from './importer'
import type { ImportProgress } from './importer'

type ReadSharedFiles = () => readonly string[]

function ImportView({ readSharedFiles, onResult }: {
  readSharedFiles?: ReadSharedFiles
  onResult: (result: string) => void
}) {
  const [status, setStatus] = useState(readSharedFiles ? '正在读取分享的文件…' : '请从系统分享菜单导入表情 ZIP。')
  const [busy, setBusy] = useState(!!readSharedFiles)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [completed, setCompleted] = useState<{ saved: number; breakdown: string } | null>(null)
  const started = useRef(false)

  async function run(getFiles: ReadSharedFiles) {
    setBusy(true)
    setProgress(null)
    setCompleted(null)
    setStatus('正在读取 ZIP…')
    let result: string
    try {
      const files = getFiles()
      if (files.length) {
        if (typeof Script.requestAccess === 'function') {
          await Script.requestAccess(['fileSystem', 'photos'])
        }
        const imported = await importSharedZIPs(files, setProgress)
        result = imported.message
        if (imported.success) setCompleted(imported)
      } else {
        result = '系统没有传来文件。请重新分享表情 ZIP。'
      }
    } catch (error) {
      result = `导入失败：${String(error)}`
    }
    setStatus(result)
    onResult(result)
    setBusy(false)
  }

  useEffect(() => {
    if (!readSharedFiles || started.current) return
    started.current = true
    void run(readSharedFiles)
  }, [])

  return (
    <VStack spacing={16}>
      <VStack spacing={12} padding={24} frame={{ maxWidth: 360 }}
        background={<RoundedRectangle cornerRadius={24} fill="secondarySystemBackground" />}>
        <Text font="headline">TG 表情导入</Text>
        {busy ? (
          <VStack spacing={10}>
            {progress?.phase === 'saving' ? (
              <ProgressView value={progress.processed} total={progress.total} progressViewStyle="linear"
                label={<Text>正在保存到照片</Text>}
                currentValueLabel={<Text monospaced>{`${progress.processed} / ${progress.total} 张`}</Text>} />
            ) : (
              <VStack spacing={10}>
                <ProgressView progressViewStyle="circular" />
                <Text font="subheadline">{progress ? '正在解压 ZIP…' : status}</Text>
              </VStack>
            )}
            {progress && <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{progress.file}</Text>}
          </VStack>
        ) : completed !== null ? (
          <VStack spacing={8}>
            <Image systemName="checkmark.circle.fill" font={36} foregroundStyle="systemGreen" />
            <Text font="title2">{`已导入 ${completed.saved} 张`}</Text>
            <Text font="subheadline" foregroundStyle="secondaryLabel">{completed.breakdown}</Text>
          </VStack>
        ) : (
          <Text font="subheadline" multilineTextAlignment="center">{status}</Text>
        )}
        <Text font="caption" foregroundStyle="secondaryLabel">1.0.7</Text>
      </VStack>
    </VStack>
  )
}

export async function showImporter(readSharedFiles?: ReadSharedFiles) {
  let result = '导入页面已关闭。'
  await Navigation.present({
    element: <ImportView readSharedFiles={readSharedFiles} onResult={value => { result = value }} />,
  })
  return result
}
