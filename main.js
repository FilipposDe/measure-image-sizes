window.imagesCompleted = new Set()
window.bgsCompleted = new Set()

/**
 * Logs a message on the top right corner of the screen.
 * Can show blinking ellipsis to indicate loading.
 * @param {String} text
 * @param {Boolean} loading
 * @param {interval} pastInterval
 * @returns the interval if loading is true
 */
function log(text, loading, pastInterval) {
	let log = document.querySelector('#image-measure-log')
	if (!log) {
		log = document.createElement('div')
		log.id = 'image-measure-log'
		log.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css?family=Inter:400,700');
                #image-measure-log{
                    font-family: 'Inter', sans-serif;
                    font-size: 14px;
                    font-weight: bold;
                    color: #fff;
                    background-color: #035270;
                    padding: 10px;
                    width: 160px;
                    height: 30px;
                    min-height: 30px;
                    line-height: 30px;
                    position: fixed;
                    top: 5px;
                    right: 5px;
                    box-sizing: content-box;
                    z-index: 999999;
                }
            </style>
            <span></span>
        `
		document.body.appendChild(log)
	}

	if (pastInterval) {
		clearInterval(pastInterval)
	}
	const span = log.querySelector('span')
	span.innerText = text
	if (loading) {
		const interval = setInterval(() => {
			const currText = span.innerText
			if (currText.endsWith('...')) {
				span.innerText = currText.substring(0, currText.length - 3)
			} else {
				span.innerText += '.'
			}
		}, 1000)
		return interval
	}
}

/**
 * Creates a canvas with the given width and height.
 * @param {Number} w width of the canvas
 * @param {Number} h height of the canvas
 * @returns the created canvas element
 */
function createCanvas(w, h) {
	const canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	return canvas
}

/**
 * Paints a background on the canvas to be used behind text.
 * @param {HTMLElement} canvas
 */
function addTextBgToCanvas(canvas) {
	const ctx = canvas.getContext('2d')
	ctx.fillStyle = 'red'
	ctx.fillRect(canvas.width / 2 - 75, canvas.height / 2 - 50, 150, 100)
}

/**
 * Adds text to the middle of the canvas.
 * @param {HTMLElement} canvas
 * @param {String} text
 */
function addTextToCanvas(canvas, text) {
	const ctx = canvas.getContext('2d')
	ctx.fillStyle = 'white'
	ctx.font = '12px Arial'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.fillText(text, canvas.width / 2, canvas.height / 2)
}

/**
 * Removes the image src and replaces it with the canvas Data URL.
 * @param {HTMLElement} img the image to set the new src
 * @param {HTMLElement} canvas the canvas that will be the new src
 */
function replaceImgCanvas(img, canvas) {
	img.src = canvas.toDataURL()
	img.srcset = ''
}

/**
 * Downloads the image to measure its blob size.
 * @param {String} src the url of the image
 * @returns {Number} the size of the image in kb
 */
async function getSrcSize(src) {
	const res = await fetch(src)
	const blob = await res.blob()
	return Math.floor(blob.size / 1024)
}

/**
 * Gets the intristic width and height of the `src` image
 * @param {String} src
 * @param {Number} width image width
 * @param {height} src image height
 * @returns {{width: Number, height: Number}}
 */
async function getSrcDimensions(src, width, height) {
	const image = await loadImage(src, width, height)
	return {
		width: image.naturalWidth,
		height: image.naturalHeight,
	}
}

/**
 * Processes an image by measuring it and adding a label to it.
 * @param {HTMLElement} img the image to process
 */
async function processImg(img) {
	if (window.imagesCompleted.has(img)) return
	const canvas = createCanvas(img.width, img.height)
	canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height)
	const size = await getSrcSize(img.currentSrc)
	let width, height
	if (img.srcset) {
		const dimensions = await getSrcDimensions(
			img.currentSrc,
			img.width,
			img.height
		)
		width = dimensions.width
		height = dimensions.height
	} else {
		width = img.naturalWidth
		height = img.naturalHeight
	}
	const text = `${width} x ${height} (${size} kb)`
	addTextBgToCanvas(canvas)
	addTextToCanvas(canvas, text)
	replaceImgCanvas(img, canvas)
	window.imagesCompleted.add(img)
}

/**
 * Replaces image with the image generated from the
 * new canvas, including the measurement label.
 * @param {HTMLElement} img the image to replace
 * @returns {Promise<undefined>}
 */
function processImgOnLoad(img) {
	return new Promise((resolve) => {
		img.addEventListener('load', () => {
			if (window.imagesCompleted.has(img)) return
			processImg(img).then(() => {
				window.imagesCompleted.add(img)
				return resolve()
			})
		})
	})
}

/**
 * Measures and processes all img elements on the page.
 * Valid images are at least 50 x 50 and not
 * belonging to a `<picture>` element.
 */
async function measureImgElements() {
	const allImages = document.querySelectorAll('img')
	const filteredImages = Array.from(allImages).filter(
		(img) =>
			img.naturalWidth > 50 &&
			img.naturalHeight > 50 &&
			img.parentElement?.tagName?.toLowerCase() !== 'PICTURE'
	)
	for (const img of filteredImages) {
		img.loading = 'eager'
		img.crossOrigin = 'anonymous'
		if (img.naturalWidth) {
			await processImg(img)
		} else {
			await processImgOnLoad(img)
		}
	}
}

/**
 * Measures and processes all picture elements.
 * Removes the other sources and the img element remains.
 */
async function measurePictureElements() {
	const allPictures = document.querySelectorAll('picture')
	const pictureImgEls = Array.from(allPictures).map((picture) =>
		picture.querySelector('img')
	)
	for (const img of pictureImgEls) {
		if (!img) continue
		img.loading = 'eager'
		img.crossOrigin = 'anonymous'
		if (img.naturalWidth) {
			await processImg(img)
		} else {
			await processImgOnLoad(img)
		}
		for (const source of img.parentElement.children) {
			source.remove()
		}
	}
}

/**
 * Creates an Image from an src
 * @param {String} src the src of the image
 * @param {Number | null} width optional width
 * @param {height | null} src optional height
 * @returns {Promise<Image>} the image
 */
const loadImage = (src, width, height) =>
	new Promise((resolve, reject) => {
		const image = new Image()
		image.onload = () => {
			resolve(image)
		}
		if (width && height) {
			image.width = width
			image.height = height
		}
		image.src = src
	})

/**
 * Adds an extra url on the background property with
 * the label contents.
 * @param {HTMLElement} el the element with the background
 * @param {HTMLElement} canvas the canvas with the label
 */
function addCanvasLabelToElBg(el, canvas, prevBg) {
	const newSrc = canvas.toDataURL()
	el.style.background = `no-repeat center/150px url(${newSrc}), ${prevBg}`
}

/**
 * Processes a background by measuring it and adding a label to it.
 * @param {HTMLElement} el the element with the background
 */
async function processElBg(el) {
	if (window.bgsCompleted.has(el)) return
	const style = el.currentStyle || window.getComputedStyle(el, false)
	const src = style.backgroundImage.slice(4, -1).replace(/"/g, '')
	const image = await loadImage(src)
	const canvas = createCanvas(150, 100)
	const size = await getSrcSize(image.currentSrc)
	const text = `${image.naturalWidth} x ${image.naturalHeight} (${size} kb)`
	addTextBgToCanvas(canvas)
	addTextToCanvas(canvas, text)
	addCanvasLabelToElBg(el, canvas, style.backgroundImage)
	window.bgsCompleted.add(el)
}

/**
 * Checks whether the element has a background image.
 * @param {HTMLElement} el
 * @returns {Boolean}
 */
function hasBg(el) {
	const style = el.currentStyle || window.getComputedStyle(el, false)
	return (
		style.backgroundImage.startsWith('url') &&
		/jpg|png/.test(style.backgroundImage)
	)
}

/**
 * Measures and processes all background images.
 */
async function measureBgElements() {
	const allElements = document.querySelectorAll('*')
	const elementsWithBg = Array.from(allElements).filter(hasBg)
	for (const el of elementsWithBg) {
		await processElBg(el)
	}
}

if (!window.noAutoRun) {
	measureAllImages()
}
async function measureAllImages() {
	const interval = log('Measuring', true)
	await measureImgElements()
	await measurePictureElements()
	await measureBgElements()
	log('Finished', false, interval)
}

async function measure() {
	if (document.readyState === 'complete') {
		measureAllImages()
	} else {
		window.addEventListener('load', () => {
			measureAllImages()
		})
	}
}
