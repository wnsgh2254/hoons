import Image from 'next/image';

const galleryImages = [
  { src: '/images/hair1.jpg', alt: '헤어 스타일 1' },
  { src: '/images/hair2.jpg', alt: '헤어 스타일 2' },
  { src: '/images/hair3.jpg', alt: '헤어 스타일 3' },
  { src: '/images/hair4.jpg', alt: '헤어 스타일 4' },
  { src: '/images/hair5.jpg', alt: '헤어 스타일 5' },
  { src: '/images/hair6.jpg', alt: '헤어 스타일 6' },
];

export default function GalleryGrid() {
  return (
    <section id="gallery" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
          갤러리
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryImages.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



