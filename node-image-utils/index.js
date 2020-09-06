const fs = require('fs-extra');
const path = require('path');
const CaReproject = require('./lib/ca-reproject');
const jp2ToPngFn = require("./lib/jp2-to-png");
const Composite = require('./lib/composite');

(async function() {
  try {
    if( process.argv[2] === 'jp2-to-png' ) {
      await jp2ToPng();
    } else if( process.argv[2] === 'composite' ) {
      await composite();
    } else if( process.argv[2] === 'reproject' ) {
      await reproject();
    } else {
      console.error('Unknown command: '+process.argv[2]);
      process.exit(-1);
    }
  } catch(e) {
    console.error('Failed to run command: ', process.argv, e);
    process.exit(-1);
  }
})();


async function composite() {
  let rootDir = process.argv.length > 2 ? process.argv[3] : process.cwd();
  let images = await Composite.run(rootDir);
  if( !images ) {
    console.warn('Failed to create composite image');
    return;
  }

  if( path.parse(rootDir).base === 'image.png' ) {
    rootDir = path.parse(rootDir).dir;
  }
  if( rootDir.match(/\/blocks/) ) {
    rootDir = path.resolve(rootDir, '..');
  }

  console.log('Writing composite file: '+path.join(rootDir, 'image.png'));
  await fs.writeFile(path.join(rootDir, 'image.png'), images.sciPng);

  console.log('Writing composite file: '+path.join(rootDir, 'web.png'));
  await fs.writeFile(path.join(rootDir, 'web.png'), images.webPng);
}

async function reproject() {
  let files = process.argv.splice(2, process.argv.length-2);
  
  const caReproject = new CaReproject(files);
  await caReproject.loadFiles();
  await caReproject.run();
}

async function jp2ToPng() {
  let rootDir = process.argv.length > 2 ? path.parse(process.argv[3]).dir : process.cwd();
  let metadata = require(rootDir+'/fragment-metadata.json');
  let data = {};
  for( let i = 0; i < metadata.fragmentsCount; i++ ) {
    console.log('Reading file: '+path.join(rootDir, 'fragments', i+'', 'image_fragment.jp2'));
    data['fragment_data_'+i] = {
      data : await fs.readFile(path.join(rootDir, 'fragments', i+'', 'image_fragment.jp2'))
    }
  }

  const images = await jp2ToPngFn(metadata, data);

  console.log('Writing file: '+path.join(rootDir, 'image.png'));
  await fs.writeFile(path.join(rootDir, 'image.png'), images.sciPng);

  console.log('Writing file: '+path.join(rootDir, 'web.png'));
  await fs.writeFile(path.join(rootDir, 'web.png'), images.webPng);

  if( process.argv.includes('--rm-fragments') ) {
    await fs.remove(path.join(rootDir, 'fragments'));
  }
}