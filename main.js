window.imagesMeasured = new Set()
window.bgsMeasured = new Set()

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
                    width: 100px;
                    height: 30px;
                    min-height: 30px;
                    line-height: 30px;
                    position: fixed;
                    top: 5px;
                    right: 5px;
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

function replaceImgOnLoad(img) {
	return new Promise((resolve) => {
		img.addEventListener('load', () => {
			replaceImg(img).then(() => resolve())
		})
	})
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

async function replaceImg(img) {
	if (window.imagesMeasured.has(img)) return
	const canvas = createCanvas(img.width, img.height)
	canvas.getContext('2d').drawImage(img, 0, 0)
	const size = await getSrcSize(img.currentSrc)
	const text = `${img.naturalWidth} x ${img.naturalHeight} (${size} kb)`
	addTextBgToCanvas(canvas)
	addTextToCanvas(canvas, text)
	img.src = canvas.toDataURL()
	img.srcset = ''
	window.imagesMeasured.add(img)
}

async function measureImgElements() {
	const allImages = document.querySelectorAll('img')
	const largeEnoughImages = Array.from(allImages).filter(
		(img) => img.naturalWidth > 200 && img.naturalHeight > 200
	)
	for (const img of largeEnoughImages) {
		img.loading = 'eager'
		img.crossOrigin = 'anonymous'
		if (img.naturalWidth) {
			await replaceImg(img)
		} else {
			await replaceImgOnLoad(img)
		}
	}
}

// const loadImage = (src) =>
// 	new Promise((resolve, reject) => {
// 		const image = new Image()
// 		image.onload = () => {
// 			resolve(image)
// 		}
// 		image.src = src
// 	})

// async function measureBg(el) {
// 	if (window.bgsMeasured.has(el)) return
// 	const src = el.style.background || el.style.backgroundImage
// 	const image = await loadImage(src.slice(4, -1).replace(/"/g, ''))
// 	const canvas = document.createElement('canvas')
// 	const ctx = canvas.getContext('2d')
// 	canvas.width = 150
// 	canvas.height = 100
// 	ctx.fillStyle = 'red'
// 	ctx.fillRect(canvas.width / 2 - 75, canvas.height / 2 - 50, 150, 100)
// 	const res = await fetch(image.src)
// 	const blob = await res.blob()
// 	const text =
// 		image.naturalWidth +
// 		' x ' +
// 		image.naturalHeight +
// 		' (' +
// 		Math.floor(blob.size / 1024) +
// 		'kb)'
// 	ctx.fillStyle = 'white'
// 	ctx.font = '12px Arial'
// 	ctx.textAlign = 'center'
// 	ctx.textBaseline = 'middle'
// 	ctx.fillText(text, canvas.width / 2, canvas.height / 2)
// 	const newSrc = canvas.toDataURL()
// 	el.style.background = `no-repeat center/150px url(${newSrc}), ${src}`
// 	console.log(src)
// 	window.bgsMeasured.add(el)
// }

// function hasBg(el) {
// 	return (
// 		(el.style.background.startsWith('url') &&
// 			/jpg|png/.test(el.style.background)) ||
// 		(el.style.backgroundImage.startsWith('url') &&
// 			/jpg|png/.test(el.style.backgroundImage))
// 	)
// }

// async function initBg() {
// 	const allElements = document.querySelectorAll('*')
// 	const elementsWithBg = Array.from(allElements).filter(hasBg)
// 	for (const el of elementsWithBg) {
// 		measureBg(el)
// 	}
// }

// measureAllImages()
async function measureAllImages() {
	const interval = log('Measuring', true)
	await measureImgElements()
	log('Finished', false, interval)
	// measureBgElements()
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
