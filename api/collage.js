import sharp from 'sharp';
import TextToSVG from 'text-to-svg';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {

  // STEP 1: Verify Sharp works at all
  try {
    await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } }
    }).jpeg().toBuffer();
  } catch (e) {
    return res.status(500).json({ success: false, error: `Sharp init failed: ${e.message}` });
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'API is awake.' });
  }

  try {
    // STEP 2: Use built-in font — no file needed on server
    const textToSVG = TextToSVG.loadSync();

    // Swapped stainUrl for cabinetUrl
    const { cabinetUrl, floorUrl, counterUrl, wallUrl } = req.body;

    if (!cabinetUrl || !floorUrl || !counterUrl || !wallUrl) {
      return res.status(400).json({ error: 'Missing required image URLs' });
    }

    // STEP 3: Fetch images
    const fetchImage = async (url, width, height) => {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CollageBot/1.0)',
          'Accept': 'image/webp,image/jpeg,image/png,image/*'
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status} — ${url}`);

      const buffer = Buffer.from(await response.arrayBuffer());

      const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
      const isPNG  = buffer[0] === 0x89 && buffer[1] === 0x50;
      const isWEBP = buffer.slice(8, 12).toString('ascii') === 'WEBP';

      if (!isJPEG && !isPNG && !isWEBP) {
        throw new Error(`Not a valid image at ${url}. Got: ${buffer.slice(0, 80).toString('utf8')}`);
      }

      return sharp(buffer, { failOnError: false })
        .resize(width, height, { fit: 'cover' })
        .toBuffer();
    };

    // Fetch 4 images, resizing all to 750x750 to fit the 2x2 grid
    const [cabinet, floor, counter, wall] = await Promise.all([
      fetchImage(cabinetUrl, 750, 750),
      fetchImage(floorUrl,   750, 750),
      fetchImage(counterUrl, 750, 750),
      fetchImage(wallUrl,    750, 750), 
    ]);

    // STEP 4: Text layers
    const headerOptions = { x: 0, y: 0, fontSize: 120, anchor: 'top', attributes: { fill: 'red', stroke: 'red', 'stroke-width': 2 } };
    const labelOptions  = { x: 0, y: 0, fontSize: 80,  anchor: 'top', attributes: { fill: 'black', stroke: 'black', 'stroke-width': 1.5 } };
    const t = (text, opts) => Buffer.from(textToSVG.getSVG(text, opts));

    // STEP 5: Composite
    const collageBuffer = await sharp({
      create: { width: 2000, height: 2000, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
    })
    .composite([
      { input: t("GUIDE IMAGE", headerOptions), top: 50,   left: 630  },
      
      // Row 1 (Cabinet replaces Stain)
      { input: cabinet,                         top: 200,  left: 150  },
      { input: t("Cabinet Color", labelOptions),top: 980,  left: 260  },
      { input: floor,                           top: 200,  left: 1100 },
      { input: t("Kitchen Floor", labelOptions),top: 980,  left: 1210 },
      
      // Row 2
      { input: counter,                         top: 1100, left: 150  },
      { input: t("Counter Top",   labelOptions),top: 1860, left: 290  },
      { input: wall,                            top: 1100, left: 1100 },
      { input: t("Wall Color",    labelOptions),top: 1860, left: 1280 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

    return res.status(200).json({
      success: true,
      image: `data:image/jpeg;base64,${collageBuffer.toString('base64')}`
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
















// import sharp from 'sharp';
// import TextToSVG from 'text-to-svg';

// export const config = { maxDuration: 30 };

// export default async function handler(req, res) {

//   // STEP 1: Verify Sharp works at all
//   try {
//     await sharp({
//       create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } }
//     }).jpeg().toBuffer();
//   } catch (e) {
//     return res.status(500).json({ success: false, error: `Sharp init failed: ${e.message}` });
//   }

//   if (req.method !== 'POST') {
//     return res.status(200).json({ message: 'API is awake.' });
//   }

//   try {
//     // STEP 2: Use built-in font — no file needed on server
//     const textToSVG = TextToSVG.loadSync();

//     const { stainUrl, floorUrl, counterUrl, cabinetUrl, wallUrl } = req.body;

//     if (!stainUrl || !floorUrl || !counterUrl || !cabinetUrl || !wallUrl) {
//       return res.status(400).json({ error: 'Missing required image URLs' });
//     }

//     // STEP 3: Fetch images
//     const fetchImage = async (url, width, height) => {
//       const response = await fetch(url, {
//         redirect: 'follow',
//         headers: {
//           'User-Agent': 'Mozilla/5.0 (compatible; CollageBot/1.0)',
//           'Accept': 'image/webp,image/jpeg,image/png,image/*'
//         }
//       });

//       if (!response.ok) throw new Error(`HTTP ${response.status} — ${url}`);

//       const buffer = Buffer.from(await response.arrayBuffer());

//       const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
//       const isPNG  = buffer[0] === 0x89 && buffer[1] === 0x50;
//       const isWEBP = buffer.slice(8, 12).toString('ascii') === 'WEBP';

//       if (!isJPEG && !isPNG && !isWEBP) {
//         throw new Error(`Not a valid image at ${url}. Got: ${buffer.slice(0, 80).toString('utf8')}`);
//       }

//       return sharp(buffer, { failOnError: false })
//         .resize(width, height, { fit: 'cover' })
//         .toBuffer();
//     };

//     const [stain, floor, counter, cabinet, wall] = await Promise.all([
//       fetchImage(stainUrl,   750, 750),
//       fetchImage(floorUrl,   750, 750),
//       fetchImage(counterUrl, 750, 750),
//       fetchImage(cabinetUrl, 360, 500),
//       fetchImage(wallUrl,    360, 500),
//     ]);

//     // STEP 4: Text layers
//     const headerOptions = { x: 0, y: 0, fontSize: 120, anchor: 'top', attributes: { fill: 'red', stroke: 'red', 'stroke-width': 2 } };
//     const labelOptions  = { x: 0, y: 0, fontSize: 80,  anchor: 'top', attributes: { fill: 'black', stroke: 'black', 'stroke-width': 1.5 } };
//     const t = (text, opts) => Buffer.from(textToSVG.getSVG(text, opts));

//     // STEP 5: Composite
//     const collageBuffer = await sharp({
//       create: { width: 2000, height: 2000, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
//     })
//     .composite([
//       { input: t("GUIDE IMAGE", headerOptions), top: 50,   left: 630  },
//       { input: stain,                           top: 200,  left: 150  },
//       { input: t("Kitchen Stain", labelOptions),top: 980,  left: 260  },
//       { input: floor,                           top: 200,  left: 1100 },
//       { input: t("Kitchen Floor", labelOptions),top: 980,  left: 1210 },
//       { input: counter,                         top: 1100, left: 150  },
//       { input: t("Counter Top",   labelOptions),top: 1860, left: 290  },
//       { input: cabinet,                         top: 1100, left: 1080 },
//       { input: t("Cabinet",       labelOptions),top: 1640, left: 1110 },
//       { input: t("Color",         labelOptions),top: 1740, left: 1150 },
//       { input: wall,                            top: 1100, left: 1490 },
//       { input: t("Wall",          labelOptions),top: 1640, left: 1580 },
//       { input: t("Color",         labelOptions),top: 1740, left: 1550 },
//     ])
//     .jpeg({ quality: 90 })
//     .toBuffer();

//     return res.status(200).json({
//       success: true,
//       image: `data:image/jpeg;base64,${collageBuffer.toString('base64')}`
//     });

//   } catch (err) {
//     return res.status(500).json({ success: false, error: err.message });
//   }
// }

