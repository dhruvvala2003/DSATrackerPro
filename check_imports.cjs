const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) checkDir(fullPath);
    else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const regex = /import.*?from\s+['"](\.[^'"]+)['"]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const importPath = match[1];
        const dirname = path.dirname(fullPath);
        let resolvedPath = path.resolve(dirname, importPath);
        
        if (!path.extname(resolvedPath)) {
          if (fs.existsSync(resolvedPath + '.js')) resolvedPath += '.js';
          else if (fs.existsSync(resolvedPath + '.jsx')) resolvedPath += '.jsx';
          else if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
            if (fs.existsSync(path.join(resolvedPath, 'index.js'))) resolvedPath = path.join(resolvedPath, 'index.js');
            else if (fs.existsSync(path.join(resolvedPath, 'index.jsx'))) resolvedPath = path.join(resolvedPath, 'index.jsx');
          }
        }
        
        if (fs.existsSync(resolvedPath)) {
          const actualName = fs.readdirSync(path.dirname(resolvedPath)).find(f => f.toLowerCase() === path.basename(resolvedPath).toLowerCase());
          if (actualName !== path.basename(resolvedPath)) {
            console.log('CASE MISMATCH:', fullPath, 'imports', importPath, 'but file is', actualName);
          }
        } else {
          console.log('MISSING:', fullPath, 'imports', importPath, '->', resolvedPath);
        }
      }
    }
  });
}

checkDir('src');
