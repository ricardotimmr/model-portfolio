import type { ImgHTMLAttributes } from 'react'
import type { ResponsiveProjectImage } from '../../data/projects'

type ResponsiveImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> & {
  image: ResponsiveProjectImage
}

function ResponsiveImage({ image, alt, ...imgProps }: ResponsiveImageProps) {
  return (
    <picture>
      {image.avifSrcSet ? <source type="image/avif" srcSet={image.avifSrcSet} sizes={image.sizes} /> : null}
      {image.webpSrcSet ? <source type="image/webp" srcSet={image.webpSrcSet} sizes={image.sizes} /> : null}
      <img
        {...imgProps}
        src={image.src}
        srcSet={image.jpegSrcSet}
        sizes={image.sizes}
        alt={alt ?? image.alt}
      />
    </picture>
  )
}

export default ResponsiveImage
