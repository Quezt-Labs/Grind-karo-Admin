export interface CarouselItem {
  id: string;
  configurationId: string;
  imageWebUrl: string;
  imageMobileUrl: string;
  alt?: string | null;
  title?: string | null;
  subtitle?: string | null;
  linkUrl?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LandingPageConfig {
  id: string;
  name: string;
  heroBannerWebUrl?: string | null;
  heroBannerMobileUrl?: string | null;
  heroBannerAlt?: string | null;
  heroBannerLinkUrl?: string | null;
  heroVideoUrl?: string | null;
  heroVideoPosterUrl?: string | null;
  title: string;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LandingPageConfigWithItems extends LandingPageConfig {
  carouselItems: CarouselItem[];
}

export interface CreateLandingPagePayload {
  name: string;
  title: string;
  heroBannerWebUrl?: string | null;
  heroBannerMobileUrl?: string | null;
  heroBannerAlt?: string | null;
  heroBannerLinkUrl?: string | null;
  heroVideoUrl?: string | null;
  heroVideoPosterUrl?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  isActive?: boolean;
}

export type UpdateLandingPagePayload = Partial<CreateLandingPagePayload>;

export interface CreateCarouselItemPayload {
  imageWebUrl: string;
  imageMobileUrl: string;
  alt?: string | null;
  title?: string | null;
  subtitle?: string | null;
  linkUrl?: string | null;
  sortOrder: number;
}

export type UpdateCarouselItemPayload = Partial<CreateCarouselItemPayload>;
