/**
 * Component Documentation Generator
 * Automatically generates documentation for all components and pages
 * Run: node scripts/generate-component-docs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  componentsDir: path.join(__dirname, '../src/views/components'),
  pagesDir: path.join(__dirname, '../src/views/pages'),
  outputFile: path.join(__dirname, '../docs/component-documentation.md'),
  outputFileHtml: path.join(__dirname, '../docs/component-documentation.html'),
  templateExtensions: ['.njk', '.html']
};

/**
 * Get all directories in a path
 */
function getDirectories(dirPath) {
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort();
}

/**
 * Get all files with specific extensions in a directory
 */
function getFiles(dirPath, extensions) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && extensions.some(ext => dirent.name.endsWith(ext)))
      .map(dirent => dirent.name);
  } catch (error) {
    return [];
  }
}

/**
 * Extract component includes from a file
 */
function extractComponentIncludes(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const includePattern = /{% include ['"]src\/views\/components\/([^/]+)\/[^'"]+['"]/g;
    const components = new Set();

    let match;
    while ((match = includePattern.exec(content)) !== null) {
      components.add(match[1]);
    }

    return Array.from(components).sort();
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}


/**
 * Analyze a component file to extract entities and structure
 */
function analyzeComponent(componentDir, componentName) {
  const componentPath = path.join(componentDir, componentName);
  const files = getFiles(componentPath, CONFIG.templateExtensions);

  if (files.length === 0) {
    return null;
  }

  const templateFile = files[0];
  const templatePath = path.join(componentPath, templateFile);

  try {
    const content = fs.readFileSync(templatePath, 'utf-8');

    // Extract nested components
    const nestedComponents = extractComponentIncludes(templatePath);

    // Detect common patterns
    const hasForm = /form|input|textarea|select/i.test(content);
    const hasCarousel = /swiper|carousel|slider/i.test(content);
    const hasModal = /modal|overlay|popup/i.test(content);
    const hasGrid = /grid|col-|row/i.test(content);
    const hasAccordion = /accordion|collapse|expand/i.test(content);
    const hasTable = /<table/i.test(content);

    // Extract entities (data elements)
    const entities = extractEntities(content);

    // Detect layout variations
    const layouts = detectLayoutVariations(content, componentName);

    // Detect ARIA roles and labels
    const ariaRoles = [];
    const ariaPattern = /role=["']([^"']+)["']/g;
    let ariaMatch;
    while ((ariaMatch = ariaPattern.exec(content)) !== null) {
      if (!ariaRoles.includes(ariaMatch[1])) {
        ariaRoles.push(ariaMatch[1]);
      }
    }

    return {
      templateFile,
      nestedComponents,
      patterns: {
        hasForm,
        hasCarousel,
        hasModal,
        hasGrid,
        hasAccordion,
        hasTable
      },
      entities,
      layouts,
      ariaRoles,
      lineCount: content.split('\n').length
    };
  } catch (error) {
    console.error(`Error analyzing component ${componentName}:`, error.message);
    return null;
  }
}

/**
 * Extract entities (data elements) from component content
 */
function extractEntities(content) {
  const entities = new Set();

  // Form inputs
  const inputPattern = /<input[^>]*(?:name|id|placeholder)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = inputPattern.exec(content)) !== null) {
    entities.add(`Input: ${match[1]}`);
  }

  // Buttons
  const buttonPattern = /<button[^>]*>([^<]+)</gi;
  while ((match = buttonPattern.exec(content)) !== null) {
    const text = match[1].trim();
    if (text && text.length < 50) {
      entities.add(`Button: ${text}`);
    }
  }

  // Links with descriptive text
  const linkPattern = /<a[^>]*>([^<{]+)</gi;
  while ((match = linkPattern.exec(content)) !== null) {
    const text = match[1].trim();
    if (text && text.length > 3 && text.length < 50 && !text.includes('{{')) {
      entities.add(`Link: ${text}`);
    }
  }

  // Images
  const imgPattern = /<img[^>]*alt=["']([^"']+)["'][^>]*>/gi;
  while ((match = imgPattern.exec(content)) !== null) {
    if (match[1] && match[1].trim()) {
      entities.add(`Image: ${match[1]}`);
    }
  }

  // Headings (for content structure)
  const headingPattern = /<h[1-6][^>]*>([^<{]+)</gi;
  while ((match = headingPattern.exec(content)) !== null) {
    const text = match[1].trim();
    if (text && !text.includes('{{') && text.length < 100) {
      entities.add(`Heading: ${text}`);
    }
  }

  // Data attributes (for dynamic content)
  const dataAttrPattern = /data-([a-z-]+)=/gi;
  const dataAttrs = new Set();
  while ((match = dataAttrPattern.exec(content)) !== null) {
    dataAttrs.add(match[1]);
  }
  if (dataAttrs.size > 0) {
    entities.add(`Data attributes: ${Array.from(dataAttrs).slice(0, 5).join(', ')}`);
  }

  return Array.from(entities).slice(0, 15); // Limit to 15 entities
}

/**
 * Detect layout variations in component
 */
function detectLayoutVariations(content, componentName) {
  const layouts = [];

  // Check for conditional classes or layout modifiers
  const classVariations = new Set();

  // Look for BEM modifiers or variant classes
  const modifierPattern = new RegExp(`${componentName.toLowerCase()}--([a-z0-9-]+)`, 'gi');
  let match;
  while ((match = modifierPattern.exec(content)) !== null) {
    classVariations.add(match[1]);
  }

  // Look for common layout patterns
  if (/col-\d+|col-[a-z]+-\d+/i.test(content)) {
    const colMatches = content.match(/col-(?:[a-z]+-)?(\d+)/gi);
    if (colMatches) {
      const uniqueCols = [...new Set(colMatches)];
      if (uniqueCols.length > 1) {
        layouts.push(`Grid columns: ${uniqueCols.slice(0, 3).join(', ')}`);
      }
    }
  }

  // Check for flex layouts
  if (/d-flex|flex-row|flex-column/i.test(content)) {
    if (/flex-row/.test(content) && /flex-column/.test(content)) {
      layouts.push('Flex: row and column variants');
    } else if (/flex-row/.test(content)) {
      layouts.push('Flex: horizontal layout');
    } else if (/flex-column/.test(content)) {
      layouts.push('Flex: vertical layout');
    }
  }

  // Check for responsive variations
  if (/d-none d-[a-z]+-block|d-block d-[a-z]+-none/i.test(content)) {
    layouts.push('Responsive: mobile/desktop variants');
  }

  // Check for size variations
  if (/\b(small|medium|large|sm|md|lg|xl)\b/i.test(content)) {
    layouts.push('Size variants available');
  }

  // Add BEM modifiers if found
  if (classVariations.size > 0) {
    layouts.push(`Modifiers: ${Array.from(classVariations).slice(0, 3).join(', ')}`);
  }

  // If no specific layouts detected, check for basic structure
  if (layouts.length === 0) {
    if (/container|wrapper/i.test(content)) {
      layouts.push('Standard container layout');
    } else {
      layouts.push('Single layout');
    }
  }

  return layouts;
}


/**
 * Build component-to-pages mapping
 */
function buildComponentPageMapping(pagesDir, componentsDir) {
  const mapping = {};
  const pages = getFiles(pagesDir, ['.html']);

  pages.forEach(page => {
    const pagePath = path.join(pagesDir, page);
    const components = extractComponentIncludes(pagePath);

    components.forEach(component => {
      if (!mapping[component]) {
        mapping[component] = [];
      }
      mapping[component].push(page);
    });
  });

  return mapping;
}

/**
 * Build page-to-components mapping
 */
function buildPageComponentMapping(pagesDir) {
  const mapping = {};
  const pages = getFiles(pagesDir, ['.html']);

  pages.forEach(page => {
    const pagePath = path.join(pagesDir, page);
    const components = extractComponentIncludes(pagePath);
    mapping[page] = components;
  });

  return mapping;
}

/**
 * Build reverse component mapping (which components include this component)
 */
function buildComponentInclusionMapping(components) {
  const inclusionMapping = {};

  Object.entries(components).forEach(([componentName, componentData]) => {
    componentData.nestedComponents.forEach(nestedComponent => {
      if (!inclusionMapping[nestedComponent]) {
        inclusionMapping[nestedComponent] = [];
      }
      inclusionMapping[nestedComponent].push(componentName);
    });
  });

  return inclusionMapping;
}


/**
 * Generate markdown documentation
 */
function generateDocumentation(components, componentPageMapping, pageComponentMapping, inclusionMapping) {
  const timestamp = new Date().toISOString().split('T')[0];
  const componentCount = Object.keys(components).length;
  const pageCount = Object.keys(pageComponentMapping).length;

  let markdown = `# Tesco Mobile Frontend - Component & Page Documentation\n\n`;
  markdown += `> **Auto-generated:** ${timestamp}  \n`;
  markdown += `> **Total Components:** ${componentCount}  \n`;
  markdown += `> **Total Pages:** ${pageCount}\n\n`;

  markdown += `## Table of Contents\n\n`;
  markdown += `1. [Component Documentation](#component-documentation)\n`;
  markdown += `2. [Page-to-Component Mapping](#page-to-component-mapping)\n`;
  markdown += `3. [Component Statistics](#component-statistics)\n\n`;

  markdown += `---\n\n`;
  markdown += `## Component Documentation\n\n`;

  // Sort components alphabetically
  const sortedComponents = Object.keys(components).sort();

  sortedComponents.forEach(componentName => {
    const component = components[componentName];
    const pages = componentPageMapping[componentName] || [];

    markdown += `### ${componentName}\n`;
    markdown += `**File:** \`src/views/components/${componentName}/${component.templateFile}\`\n\n`;

    // Detected patterns
    if (Object.values(component.patterns).some(v => v)) {
      markdown += `**Detected Patterns:**\n`;
      if (component.patterns.hasForm) markdown += `- Form elements\n`;
      if (component.patterns.hasCarousel) markdown += `- Carousel/Slider\n`;
      if (component.patterns.hasModal) markdown += `- Modal/Overlay\n`;
      if (component.patterns.hasGrid) markdown += `- Grid layout\n`;
      if (component.patterns.hasAccordion) markdown += `- Accordion/Collapsible\n`;
      if (component.patterns.hasTable) markdown += `- Table structure\n`;
      markdown += `\n`;
    }

    // Entities
    if (component.entities && component.entities.length > 0) {
      markdown += `**Entities:**\n`;
      component.entities.forEach(entity => {
        markdown += `- ${entity}\n`;
      });
      markdown += `\n`;
    }

    // Layout variations
    if (component.layouts && component.layouts.length > 0) {
      markdown += `**Layout Options (${component.layouts.length}):**\n`;
      component.layouts.forEach(layout => {
        markdown += `- ${layout}\n`;
      });
      markdown += `\n`;
    }

    // ARIA roles
    if (component.ariaRoles.length > 0) {
      markdown += `**ARIA Roles:** ${component.ariaRoles.join(', ')}\n\n`;
    }

    // Nested components
    if (component.nestedComponents.length > 0) {
      markdown += `**Nested Components:**\n`;
      component.nestedComponents.forEach(nested => {
        markdown += `- \`${nested}\`\n`;
      });
      markdown += `\n`;
    } else {
      markdown += `**Nested Components:** None (standalone component)\n\n`;
    }

    // Included in (reverse mapping)
    const includedIn = inclusionMapping[componentName] || [];
    if (includedIn.length > 0) {
      markdown += `**Included in Components (${includedIn.length}):**\n`;
      includedIn.forEach(parent => {
        markdown += `- \`${parent}\`\n`;
      });
      markdown += `\n`;
    }


    // Pages where used
    markdown += `**Pages Where Applied (${pages.length}):**\n`;
    if (pages.length > 0) {
      pages.forEach(page => {
        markdown += `- \`${page}\`\n`;
      });
    } else {
      markdown += `- *Not currently used in any pages*\n`;
    }

    markdown += `\n**Template Size:** ${component.lineCount} lines\n\n`;
    markdown += `---\n\n`;
  });

  // Page-to-Component Mapping
  markdown += `## Page-to-Component Mapping\n\n`;

  const sortedPages = Object.keys(pageComponentMapping).sort();

  sortedPages.forEach(page => {
    const components = pageComponentMapping[page];
    markdown += `### ${page}\n`;
    markdown += `**Components Used (${components.length}):**\n`;
    if (components.length > 0) {
      components.forEach(component => {
        markdown += `- \`${component}\`\n`;
      });
    } else {
      markdown += `- *No components included*\n`;
    }
    markdown += `\n---\n\n`;
  });

  // Statistics
  markdown += `## Component Statistics\n\n`;

  // Most used components
  const componentUsage = Object.entries(componentPageMapping)
    .map(([name, pages]) => ({ name, count: pages.length }))
    .sort((a, b) => b.count - a.count);

  markdown += `### Most Used Components\n\n`;
  markdown += `| Component | Pages Used |\n`;
  markdown += `|-----------|------------|\n`;
  componentUsage.slice(0, 10).forEach(({ name, count }) => {
    markdown += `| ${name} | ${count} |\n`;
  });
  markdown += `\n`;

  // Unused components
  const unusedComponents = componentUsage.filter(c => c.count === 0);
  if (unusedComponents.length > 0) {
    markdown += `### Unused Components (${unusedComponents.length})\n\n`;
    unusedComponents.forEach(({ name }) => {
      markdown += `- \`${name}\`\n`;
    });
    markdown += `\n`;
  }

  // Complex components (with nested components)
  const complexComponents = sortedComponents
    .filter(name => components[name].nestedComponents.length > 0)
    .map(name => ({
      name,
      nestedCount: components[name].nestedComponents.length
    }))
    .sort((a, b) => b.nestedCount - a.nestedCount);

  if (complexComponents.length > 0) {
    markdown += `### Components with Nested Components (${complexComponents.length})\n\n`;
    markdown += `| Component | Nested Components |\n`;
    markdown += `|-----------|-------------------|\n`;
    complexComponents.slice(0, 10).forEach(({ name, nestedCount }) => {
      markdown += `| ${name} | ${nestedCount} |\n`;
    });
    markdown += `\n`;
  }

  markdown += `---\n\n`;
  markdown += `*This documentation was automatically generated by \`scripts/generate-component-docs.js\`*\n`;

  return markdown;
}

/**
 * Generate HTML documentation with sticky sidebar
 */
function generateHtmlDocumentation(components, componentPageMapping, pageComponentMapping, inclusionMapping) {
  const timestamp = new Date().toISOString().split('T')[0];
  const componentCount = Object.keys(components).length;
  const pageCount = Object.keys(pageComponentMapping).length;
  const sortedComponents = Object.keys(components).sort();

  // Generate sidebar navigation
  let sidebarHtml = '';
  sortedComponents.forEach(componentName => {
    sidebarHtml += `        <li><a href="#${componentName}">${componentName}</a></li>\n`;
  });

  // Generate component sections
  let componentsHtml = '';
  sortedComponents.forEach(componentName => {
    const component = components[componentName];
    const pages = componentPageMapping[componentName] || [];

    componentsHtml += `    <section id="${componentName}" class="component-section">\n`;
    componentsHtml += `      <h2>${componentName}</h2>\n`;
    componentsHtml += `      <p class="file-path"><strong>File:</strong> <code>src/views/components/${componentName}/${component.templateFile}</code></p>\n`;

    // Detected patterns
    if (Object.values(component.patterns).some(v => v)) {
      componentsHtml += `      <div class="section-block">\n`;
      componentsHtml += `        <h3>Detected Patterns</h3>\n`;
      componentsHtml += `        <ul class="pattern-list">\n`;
      if (component.patterns.hasForm) componentsHtml += `          <li><span class="badge badge-form">Form elements</span></li>\n`;
      if (component.patterns.hasCarousel) componentsHtml += `          <li><span class="badge badge-carousel">Carousel/Slider</span></li>\n`;
      if (component.patterns.hasModal) componentsHtml += `          <li><span class="badge badge-modal">Modal/Overlay</span></li>\n`;
      if (component.patterns.hasGrid) componentsHtml += `          <li><span class="badge badge-grid">Grid layout</span></li>\n`;
      if (component.patterns.hasAccordion) componentsHtml += `          <li><span class="badge badge-accordion">Accordion/Collapsible</span></li>\n`;
      if (component.patterns.hasTable) componentsHtml += `          <li><span class="badge badge-table">Table structure</span></li>\n`;
      componentsHtml += `        </ul>\n`;
      componentsHtml += `      </div>\n`;
    }

    // Entities
    if (component.entities && component.entities.length > 0) {
      componentsHtml += `      <div class="section-block">\n`;
      componentsHtml += `        <h3>Entities</h3>\n`;
      componentsHtml += `        <ul>\n`;
      component.entities.forEach(entity => {
        componentsHtml += `          <li>${escapeHtml(entity)}</li>\n`;
      });
      componentsHtml += `        </ul>\n`;
      componentsHtml += `      </div>\n`;
    }

    // Layout variations
    if (component.layouts && component.layouts.length > 0) {
      componentsHtml += `      <div class="section-block">\n`;
      componentsHtml += `        <h3>Layout Options <span class="count">(${component.layouts.length})</span></h3>\n`;
      componentsHtml += `        <ul>\n`;
      component.layouts.forEach(layout => {
        componentsHtml += `          <li>${escapeHtml(layout)}</li>\n`;
      });
      componentsHtml += `        </ul>\n`;
      componentsHtml += `      </div>\n`;
    }

    // ARIA roles
    if (component.ariaRoles.length > 0) {
      componentsHtml += `      <div class="section-block">\n`;
      componentsHtml += `        <h3>ARIA Roles</h3>\n`;
      componentsHtml += `        <p class="aria-roles">${component.ariaRoles.map(role => `<code>${role}</code>`).join(', ')}</p>\n`;
      componentsHtml += `      </div>\n`;
    }

    // Nested components
    componentsHtml += `      <div class="section-block">\n`;
    componentsHtml += `        <h3>Nested Components</h3>\n`;
    if (component.nestedComponents.length > 0) {
      componentsHtml += `        <ul class="nested-components">\n`;
      component.nestedComponents.forEach(nested => {
        componentsHtml += `          <li><a href="#${nested}"><code>${nested}</code></a></li>\n`;
      });
      componentsHtml += `        </ul>\n`;
    } else {
      componentsHtml += `        <p class="muted">None (standalone component)</p>\n`;
    }
    componentsHtml += `      </div>\n`;

    // Pages where used
    componentsHtml += `      <div class="section-block">\n`;
    componentsHtml += `        <h3>Pages Where Applied <span class="count">(${pages.length})</span></h3>\n`;
    if (pages.length > 0) {
      componentsHtml += `        <ul class="page-list">\n`;
      pages.forEach(page => {
        componentsHtml += `          <li><code>${page}</code></li>\n`;
      });
      componentsHtml += `        </ul>\n`;
    } else {
      componentsHtml += `        <p class="muted">Not currently used in any pages</p>\n`;
    }
    componentsHtml += `      </div>\n`;

    // Included in (reverse mapping)
    const includedIn = inclusionMapping[componentName] || [];
    if (includedIn.length > 0) {
      componentsHtml += `      <div class=\"section-block\">\n`;
      componentsHtml += `        <h3>Included in Components <span class=\"count\">(${includedIn.length})</span></h3>\n`;
      componentsHtml += `        <ul class=\"nested-components\">\n`;
      includedIn.forEach(parent => {
        componentsHtml += `          <li><a href="#${parent}"><code>${parent}</code></a></li>\n`;
      });
      componentsHtml += `        </ul>\n`;
      componentsHtml += `      </div>\n`;
    }


    // Template size
    componentsHtml += `      <div class="meta-info">\n`;
    componentsHtml += `        <span class="template-size">Template Size: ${component.lineCount} lines</span>\n`;
    componentsHtml += `      </div>\n`;

    componentsHtml += `    </section>\n\n`;
  });

  // Generate full HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Documentation - Tesco Mobile Frontend</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    
    .container {
      display: flex;
      min-height: 100vh;
    }
    
    /* Sidebar */
    .sidebar {
      width: 280px;
      background: #fff;
      border-right: 1px solid #e0e0e0;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      flex-shrink: 0;
    }
    
    .sidebar-header {
      padding: 24px 20px;
      background: #0050aa;
      color: white;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    .sidebar-header h1 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .sidebar-header .stats {
      font-size: 13px;
      opacity: 0.9;
    }
    
    .sidebar-nav {
      padding: 12px 0;
    }
    
    .sidebar-nav ul {
      list-style: none;
    }
    
    .sidebar-nav li {
      margin: 0;
    }
    
    .sidebar-nav a {
      display: block;
      padding: 8px 20px;
      color: #555;
      text-decoration: none;
      font-size: 14px;
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }
    
    .sidebar-nav a:hover {
      background: #f8f8f8;
      color: #0050aa;
      border-left-color: #0050aa;
    }
    
    .sidebar-nav a.active {
      background: #e3f2fd;
      color: #0050aa;
      border-left-color: #0050aa;
      font-weight: 500;
    }
    
    /* Main content */
    .main-content {
      flex: 1;
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
      overflow-y: auto;
    }
    
    .page-header {
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .page-header h1 {
      font-size: 32px;
      color: #0050aa;
      margin-bottom: 12px;
    }
    
    .page-header .meta {
      color: #666;
      font-size: 14px;
    }
    
    /* Component sections */
    .component-section {
      background: white;
      border-radius: 8px;
      padding: 32px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      scroll-margin-top: 20px;
    }
    
    .component-section h2 {
      font-size: 28px;
      color: #0050aa;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e3f2fd;
    }
    
    .file-path {
      color: #666;
      margin-bottom: 24px;
      font-size: 14px;
    }
    
    .file-path code {
      background: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 13px;
      color: #d63384;
    }
    
    .section-block {
      margin-bottom: 24px;
    }
    
    .section-block h3 {
      font-size: 18px;
      color: #333;
      margin-bottom: 12px;
      font-weight: 600;
    }
    
    .count {
      font-size: 14px;
      color: #666;
      font-weight: normal;
    }
    
    /* Badges */
    .pattern-list {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .pattern-list li {
      margin: 0;
    }
    
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
    }
    
    .badge-form { background: #e3f2fd; color: #1976d2; }
    .badge-carousel { background: #f3e5f5; color: #7b1fa2; }
    .badge-modal { background: #fff3e0; color: #f57c00; }
    .badge-grid { background: #e8f5e9; color: #388e3c; }
    .badge-accordion { background: #fce4ec; color: #c2185b; }
    .badge-table { background: #e0f2f1; color: #00796b; }
    
    /* Lists */
    ul {
      list-style: none;
      padding-left: 0;
    }
    
    .section-block ul li {
      padding: 6px 0;
      padding-left: 20px;
      position: relative;
    }
    
    .section-block ul li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: #0050aa;
      font-weight: bold;
    }
    
    .nested-components li:before,
    .page-list li:before {
      content: "→";
    }
    
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 13px;
      font-family: 'Courier New', monospace;
      color: #d63384;
    }
    
    .nested-components a {
      color: #0050aa;
      text-decoration: none;
    }
    
    .nested-components a:hover {
      text-decoration: underline;
    }
    
    .aria-roles code {
      margin-right: 8px;
    }
    
    .muted {
      color: #999;
      font-style: italic;
    }
    
    .meta-info {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      color: #666;
      font-size: 14px;
    }
    
    /* Search box */
    .search-box {
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
      position: sticky;
      top: 100px;
      background: white;
      z-index: 9;
    }
    
    .search-box input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .search-box input:focus {
      outline: none;
      border-color: #0050aa;
      box-shadow: 0 0 0 3px rgba(0, 80, 170, 0.1);
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .container {
        flex-direction: column;
      }
      
      .sidebar {
        width: 100%;
        height: auto;
        position: relative;
      }
      
      .main-content {
        padding: 20px;
      }
    }
    
    /* Smooth scrolling */
    html {
      scroll-behavior: smooth;
    }
  </style>
</head>
<body>
  <div class="container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1>Component Docs</h1>
        <div class="stats">
          ${componentCount} Components • ${pageCount} Pages<br>
          Generated: ${timestamp}
        </div>
      </div>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="Search components..." autocomplete="off">
      </div>
      <nav class="sidebar-nav">
        <ul id="componentList">
${sidebarHtml}
        </ul>
      </nav>
    </aside>
    
    <main class="main-content">
      <div class="page-header">
        <h1>Tesco Mobile Frontend</h1>
        <p class="meta">Component & Page Documentation</p>
      </div>
      
${componentsHtml}
    </main>
  </div>
  
  <script>
    // Highlight active section in sidebar
    const sections = document.querySelectorAll('.component-section');
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            }
          });
        }
      });
    }, {
      rootMargin: '-100px 0px -66%',
      threshold: 0
    });
    
    sections.forEach(section => observer.observe(section));
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const componentList = document.getElementById('componentList');
    const componentLinks = componentList.querySelectorAll('a');
    
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      
      componentLinks.forEach(link => {
        const componentName = link.textContent.toLowerCase();
        const listItem = link.parentElement;
        
        if (componentName.includes(searchTerm)) {
          listItem.style.display = '';
        } else {
          listItem.style.display = 'none';
        }
      });
    });
    
    // Smooth scroll with offset
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          const yOffset = -20;
          const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      });
    });
  </script>
</body>
</html>`;

  return html;
}

// Helper function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}


/**
 * Main execution
 */
async function main() {
  console.log('🔍 Analyzing components and pages...\n');

  // Get all components
  const componentDirs = getDirectories(CONFIG.componentsDir);
  console.log(`Found ${componentDirs.length} components`);

  // Analyze each component
  const components = {};
  componentDirs.forEach(componentName => {
    const analysis = analyzeComponent(CONFIG.componentsDir, componentName);
    if (analysis) {
      components[componentName] = analysis;
    }
  });

  // Build mappings
  console.log('📊 Building component-page mappings...');
  const componentPageMapping = buildComponentPageMapping(CONFIG.pagesDir, CONFIG.componentsDir);
  const pageComponentMapping = buildPageComponentMapping(CONFIG.pagesDir);
  const inclusionMapping = buildComponentInclusionMapping(components);

  console.log(`Found ${Object.keys(pageComponentMapping).length} pages\n`);

  // Generate documentation
  console.log('📝 Generating documentation...');
  const documentation = generateDocumentation(components, componentPageMapping, pageComponentMapping, inclusionMapping);
  const htmlDocumentation = generateHtmlDocumentation(components, componentPageMapping, pageComponentMapping, inclusionMapping);

  // Ensure docs directory exists
  const docsDir = path.dirname(CONFIG.outputFile);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Write documentation files
  fs.writeFileSync(CONFIG.outputFile, documentation, 'utf-8');
  fs.writeFileSync(CONFIG.outputFileHtml, htmlDocumentation, 'utf-8');

  console.log(`✅ Documentation generated successfully!`);
  console.log(`📄 Markdown: ${CONFIG.outputFile}`);
  console.log(`🌐 HTML: ${CONFIG.outputFileHtml}\n`);

  // Summary
  console.log('Summary:');
  console.log(`- Components documented: ${Object.keys(components).length}`);
  console.log(`- Pages analyzed: ${Object.keys(pageComponentMapping).length}`);
  console.log(`- Total component usages: ${Object.values(componentPageMapping).reduce((sum, pages) => sum + pages.length, 0)}`);
}

// Run the script
main().catch(error => {
  console.error('❌ Error generating documentation:', error);
  process.exit(1);
});
