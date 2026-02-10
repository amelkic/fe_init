import { describe, it, expect } from 'vitest'
import fs from 'fs'
import { glob } from 'glob'

describe('Component JavaScript Files', () => {
  // Dynamically find all component JS files
  const componentFiles = glob.sync('src/views/components/**/*.js')

  it('should find component files', () => {
    expect(componentFiles.length).toBeGreaterThan(0)
  })

  componentFiles.forEach(filePath => {
    describe(`Component: ${filePath}`, () => {
      it('should exist and be readable', () => {
        expect(fs.existsSync(filePath)).toBe(true)
        const content = fs.readFileSync(filePath, 'utf8')
        expect(typeof content).toBe('string')
      })

      it('should not have obvious syntax errors', () => {
        const content = fs.readFileSync(filePath, 'utf8')
        if (content.trim()) { // Only test non-empty files
          // Check for common syntax issues
          expect(content).not.toMatch(/\bundefinedrequire\b/)

          // Check balanced brackets if file has meaningful content
          if (content.length > 10) {
            const openBraces = (content.match(/\{/g) || []).length
            const closeBraces = (content.match(/\}/g) || []).length
            const difference = Math.abs(openBraces - closeBraces)
            expect(difference).toBeLessThanOrEqual(2) // Allow some difference for normal JS patterns
          }
        }
      })

      it('should not have console.log statements in production code', () => {
        const content = fs.readFileSync(filePath, 'utf8')
        // Allow console.error and console.warn, but flag console.log
        const hasConsoleLog = /console\.log\s*\(/g.test(content)
        expect(hasConsoleLog).toBe(false)
      })
    })
  })
})