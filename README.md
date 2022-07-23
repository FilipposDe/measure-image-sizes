# Image measurement script

A script that calculates real (intrinsic) image dimensions and file size and displays them on the images of the page.

The tool is experimental and might not work on every occasion.

## Supports

-   `img` elements
-   `picture` elements
-   Element CSS `background` property
-   Lazy-loaded images (both with the `loading` attribute and with JS libraries)

## Instructions

Simply run the script. You can create a [bookmarklet](https://caiorss.github.io/bookmarklet-maker/) and run it from the bookmark bar.

If the measurement tab is not displayed on an image, it might be because of lazy loading. Run the script again after the image has loaded.
