export enum ImageGenerationModelEnum {
    // Image-Specific Models
    NANO_BANANA_PRO = 'gemini-3-pro-image-preview',
    NANO_BANANA = 'gemini-2.5-flash-image-preview',
    IMAGEN_4 = 'imagen-4.0-generate-001',
    IMAGEN_4_ULTRA = 'imagen-4.0-ultra-generate-001',
    IMAGEN_4_FAST = 'imagen-4.0-fast-generate-001',
    IMAGEN_3_FAST = 'imagen-3.0-fast-generate-001',
    IMAGEN_3 = 'imagen-3.0-generate-002'
}

export interface ImageGenerationModelMeta {
    viewValue: string;
    isImage: boolean;
    isSvg: boolean;
    imageSrc: string;
    icon: string;
}

export const ImageGenerationModelConfig: Record<ImageGenerationModelEnum, ImageGenerationModelMeta> = {
    [ImageGenerationModelEnum.NANO_BANANA_PRO]: {
        viewValue: 'Nano Banana Pro',
        isImage: true,
        isSvg: false,
        imageSrc: 'assets/images/banana-peel.png',
        icon: '',
    },
    [ImageGenerationModelEnum.NANO_BANANA]: {
        viewValue: 'Nano Banana',
        isImage: true,
        isSvg: false,
        imageSrc: 'assets/images/banana-peel.png',
        icon: '',
    },
    [ImageGenerationModelEnum.IMAGEN_4]: {
        viewValue: 'Imagen 4',
        isImage: false,
        isSvg: true,
        imageSrc: '',
        icon: 'gemini-spark-icon',
    },
    [ImageGenerationModelEnum.IMAGEN_4_ULTRA]: {
        viewValue: 'Imagen 4 Ultra',
        isImage: false,
        isSvg: true,
        imageSrc: '',
        icon: 'gemini-spark-icon',
    },
    [ImageGenerationModelEnum.IMAGEN_4_FAST]: {
        viewValue: 'Imagen 4 Fast',
        isImage: false,
        isSvg: true,
        imageSrc: '',
        icon: 'gemini-spark-icon',
    },
    [ImageGenerationModelEnum.IMAGEN_3]: {
        viewValue: 'Imagen 3',
        isImage: false,
        isSvg: false,
        imageSrc: '',
        icon: 'auto_awesome',
    },
    [ImageGenerationModelEnum.IMAGEN_3_FAST]: {
        viewValue: 'Imagen 3 Fast',
        isImage: false,
        isSvg: false,
        imageSrc: '',
        icon: 'auto_awesome',
    }
};