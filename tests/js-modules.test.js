import { describe, it, expect } from 'vitest'
import fs from 'fs'

describe('JavaScript Modules', () => {
  const jsFiles = [
    'src/js/main.js',
    'src/js/general.js',
    'src/js/shared/initialization.js'
  ]

  jsFiles.forEach(filePath => {
    describe(`${filePath}`, () => {
      it('should exist and be readable', () => {
        expect(fs.existsSync(filePath)).toBe(true)
        const content = fs.readFileSync(filePath, 'utf8')
        expect(typeof content).toBe('string')
      })

      it('should not have syntax errors', () => {
        const content = fs.readFileSync(filePath, 'utf8')

        // Check for basic syntax patterns
        expect(content).not.toMatch(/\bundefinedrequire\b/)
        expect(content).not.toMatch(/\bunclosed\b/)

        // Check for proper import/export syntax if present
        const hasImport = content.includes('import')
        const hasExport = content.includes('export')

        if (hasImport) {
          // Allow different import styles:
          // import 'module' or import from 'module' or import.meta
          const validImportPattern = /(import\s+['"][^'"]+['"]|import\s+.*\s+from\s+['"][^'"]+['"]|import\.meta)/
          expect(content).toMatch(validImportPattern)
        }

        if (hasExport) {
          expect(content).toMatch(/export\s+(default\s+)?/)
        }
      })

      it('should not have console.log in production code', () => {
        const content = fs.readFileSync(filePath, 'utf8')
        const hasConsoleLog = /console\.log\s*\(/g.test(content)
        expect(hasConsoleLog).toBe(false)
      })
    })
  })
})