import { describe, it, expect } from 'vitest'
import { buildEmbedUrl } from '../../src/utils.js'

const YT_WATCH = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const YT_SHORT = 'https://youtu.be/dQw4w9WgXcQ'
const VIDEO_ID = 'dQw4w9WgXcQ'
const GD_URL = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view'
const GD_FILE_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs'

describe('buildEmbedUrl — YouTube watch URL', () => {
  it('produces a YouTube embed URL', () => {
    expect(buildEmbedUrl(YT_WATCH, 0, 0, 0)).toContain('/embed/' + VIDEO_ID)
  })

  it('does not use the original watch URL', () => {
    expect(buildEmbedUrl(YT_WATCH, 0, 0, 0)).not.toContain('watch?v=')
  })
})

describe('buildEmbedUrl — YouTube short URL', () => {
  it('extracts video ID from youtu.be shortlink', () => {
    expect(buildEmbedUrl(YT_SHORT, 0, 0, 0)).toContain('/embed/' + VIDEO_ID)
  })
})

describe('buildEmbedUrl — start time selection', () => {
  it('uses resumeSec when it is greater than startSec', () => {
    const url = buildEmbedUrl(YT_WATCH, 30, 0, 45)
    expect(url).toContain('start=45')
  })

  it('uses startSec when it is greater than resumeSec', () => {
    const url = buildEmbedUrl(YT_WATCH, 60, 0, 10)
    expect(url).toContain('start=60')
  })

  it('start=0 when both are 0', () => {
    const url = buildEmbedUrl(YT_WATCH, 0, 0, 0)
    expect(url).toContain('start=0')
  })
})

describe('buildEmbedUrl — end time', () => {
  it('includes end param when endSec > 0', () => {
    const url = buildEmbedUrl(YT_WATCH, 0, 120, 0)
    expect(url).toContain('end=120')
  })

  it('omits end param when endSec is 0', () => {
    const url = buildEmbedUrl(YT_WATCH, 0, 0, 0)
    expect(url).not.toContain('end=')
  })
})

describe('buildEmbedUrl — Google Drive', () => {
  it('generates a Drive preview URL with the correct file ID', () => {
    const url = buildEmbedUrl(GD_URL, 0, 0, 0)
    expect(url).toContain(`/file/d/${GD_FILE_ID}/preview`)
  })

  it('appends resume time as fragment', () => {
    const url = buildEmbedUrl(GD_URL, 0, 0, 45)
    expect(url).toContain('#t=45')
  })
})

describe('buildEmbedUrl — generic URL', () => {
  it('appends ?t= for a URL with no query string', () => {
    const url = buildEmbedUrl('https://example.com/video.mp4', 30, 0, 0)
    expect(url).toBe('https://example.com/video.mp4?t=30')
  })

  it('appends &t= for a URL that already has a query string', () => {
    const url = buildEmbedUrl('https://example.com/video?fmt=mp4', 30, 0, 0)
    expect(url).toBe('https://example.com/video?fmt=mp4&t=30')
  })
})
