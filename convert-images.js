const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Dossier source et destination
const sourceDirs = [
    'assets/images/slider',
    'assets/images/gallery/concerts',
    'assets/images/gallery/entreprise',
    'assets/images/gallery/mariage',
    'assets/images/gallery/portraits',
    'assets/images'
];
const outputDir = 'assets/images/optimized';

// Fonction pour créer le dossier de sortie s'il n'existe pas
async function createOutputDir() {
    try {
        await fs.mkdir(outputDir, { recursive: true });
        for (const dir of sourceDirs) {
            const relativePath = path.relative('assets/images', dir);
            await fs.mkdir(path.join(outputDir, relativePath), { recursive: true });
        }
    } catch (err) {
        console.error('Erreur lors de la création des dossiers de sortie :', err);
    }
}

// Fonction pour convertir une image en WebP avec redimensionnement
async function convertImage(filePath, outputPath) {
    try {
        const image = sharp(filePath);
        const metadata = await image.metadata();

        // Redimensionner en conservant le ratio d’aspect
        if (filePath.includes('slider')) {
            // Carrousel : largeur max 1920px
            image.resize({
                width: 1920,
                fit: 'inside', // Conserve le ratio d’aspect
                withoutEnlargement: true // Ne pas agrandir si l’image est plus petite
            });
        } else if (filePath.includes('gallery')) {
            // Galerie : largeur max 400px
            image.resize({
                width: 400,
                fit: 'inside',
                withoutEnlargement: true
            });
        } else if (filePath.includes('instagram')) {
            // Icône Instagram : 24x24
            image.resize({
                width: 24,
                height: 24,
                fit: 'contain'
            });
        }

        await image
            .webp({ quality: 90 }) // Qualité à 90
            .toFile(outputPath);

        const newMetadata = await sharp(outputPath).metadata();
        console.log(`Image convertie : ${filePath} -> ${outputPath} (${newMetadata.width}x${newMetadata.height})`);
        return { width: newMetadata.width, height: newMetadata.height };
    } catch (err) {
        console.error(`Erreur lors de la conversion de ${filePath} :`, err);
        return null;
    }
}

// Fonction principale pour traiter toutes les images
async function convertAllImages() {
    await createOutputDir();
    const dimensionsMap = {};

    for (const dir of sourceDirs) {
        try {
            const files = await fs.readdir(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stats = await fs.stat(filePath);

                if (stats.isFile() && /\.(jpe?g|png)$/i.test(file)) {
                    const relativePath = path.relative('assets/images', dir);
                    const outputFileName = path.basename(file, path.extname(file)) + '.webp';
                    const outputPath = path.join(outputDir, relativePath, outputFileName);
                    const dims = await convertImage(filePath, outputPath);
                    if (dims) {
                        dimensionsMap[filePath] = dims;
                    }
                }
            }
        } catch (err) {
            console.error(`Erreur lors du traitement du dossier ${dir} :`, err);
        }
    }

    // Affiche les dimensions pour le HTML
    console.log('\nDimensions des images pour le HTML :');
    for (const [filePath, dims] of Object.entries(dimensionsMap)) {
        console.log(`${filePath}: width="${dims.width}" height="${dims.height}"`);
    }
}

// Exécute le script
convertAllImages().then(() => {
    console.log('Conversion terminée !');
}).catch(err => {
    console.error('Erreur lors de la conversion :', err);
});