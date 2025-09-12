#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

/**
 * Script to convert <CodeBlock> components to plain markdown code blocks
 * in MDX files throughout the docs directory
 */

// Find all MDX files in docs
const mdxFiles = glob.sync('src/pages/docs/**/*.mdx', { 
  cwd: process.cwd(),
  absolute: true 
});

console.log(`Found ${mdxFiles.length} MDX files to process`);

let totalReplacements = 0;

mdxFiles.forEach(filePath => {
  console.log(`\nProcessing: ${path.relative(process.cwd(), filePath)}`);
  
  let content = readFileSync(filePath, 'utf8');
  let fileReplacements = 0;
  
  // Regex to match <CodeBlock> components with their props
  // This handles multiline CodeBlocks with fileName and code props
  const codeBlockRegex = /<CodeBlock\s*\n?\s*fileName="[^"]*"\s*\n?\s*code=\{`([^`]*(?:`[^`][^`]*)*)`\}\s*\n?\s*\/>/gs;
  
  content = content.replace(codeBlockRegex, (match, codeContent) => {
    fileReplacements++;
    
    // Determine language from the code content
    let language = 'typescript'; // default
    
    if (codeContent.includes('import ') || codeContent.includes('export ')) {
      language = 'typescript';
    } else if (codeContent.includes('{') && codeContent.includes('"')) {
      language = 'typescript'; // JSON-like or config
    } else if (codeContent.includes('function ') || codeContent.includes('const ')) {
      language = 'typescript';
    } else if (codeContent.includes('<!DOCTYPE') || codeContent.includes('<html')) {
      language = 'html';
    } else if (codeContent.includes('.class') || codeContent.includes('#id')) {
      language = 'css';
    }
    
    return `\`\`\`${language}\n${codeContent}\n\`\`\``;
  });
  
  // Also handle single-line CodeBlocks (less common but possible)
  const singleLineRegex = /<CodeBlock\s+fileName="[^"]*"\s+code=\{`([^`]+)`\}\s*\/>/g;
  
  content = content.replace(singleLineRegex, (match, codeContent) => {
    fileReplacements++;
    return `\`\`\`typescript\n${codeContent}\n\`\`\``;
  });
  
  // Handle CodeBlocks with different spacing and line breaks (more flexible)
  const flexibleRegex = /<CodeBlock[^>]*fileName="[^"]*"[^>]*code=\{`([\s\S]*?)`\}[^>]*\/>/g;
  
  content = content.replace(flexibleRegex, (match, codeContent) => {
    // Skip if already replaced
    if (match.includes('```')) return match;
    
    fileReplacements++;
    
    // Determine language
    let language = 'typescript';
    if (codeContent.includes('import ') || codeContent.includes('export ')) {
      language = 'typescript';
    }
    
    return `\`\`\`${language}\n${codeContent}\n\`\`\``;
  });
  
  // Handle CodeBlocks that span multiple lines with different patterns
  const multilineRegex = /<CodeBlock\s*\n[\s\S]*?fileName="[^"]*"[\s\S]*?code=\{`([\s\S]*?)`\}[\s\S]*?\/>/g;
  
  content = content.replace(multilineRegex, (match, codeContent) => {
    // Skip if already replaced
    if (match.includes('```')) return match;
    
    fileReplacements++;
    return `\`\`\`typescript\n${codeContent}\n\`\`\``;
  });
  
  if (fileReplacements > 0) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Replaced ${fileReplacements} CodeBlock(s)`);
    totalReplacements += fileReplacements;
  } else {
    console.log(`  ⏭️  No CodeBlocks found`);
  }
});

console.log(`\n🎉 Conversion complete!`);
console.log(`📊 Total replacements: ${totalReplacements}`);
console.log(`📁 Files processed: ${mdxFiles.length}`);

if (totalReplacements > 0) {
  console.log(`\n✨ All <CodeBlock> components have been converted to plain markdown code blocks!`);
} else {
  console.log(`\n🤔 No CodeBlock components found to convert.`);
}
