import { useState } from 'react'
import { apiRequest } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'

// The server's limit too (server/upload.ts).
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10 MB

/**
 * Uploads an image to file storage (/api/upload), with the checks and toasts
 * every image field shares. `upload` resolves to the image's URL, or null
 * when the file was refused or the upload failed (the toast says why).
 */
export const useImageUpload = () => {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)

  const upload = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, GIF)',
        variant: 'destructive',
      })
      return null
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 10MB',
        variant: 'destructive',
      })
      return null
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const { fileUrl } = await apiRequest<{ fileUrl: string }>('/api/upload', {
        method: 'POST',
        body: formData,
      })

      toast({
        title: 'Image uploaded',
        description: 'Save the form to keep it.',
      })

      return fileUrl
    } catch (error) {
      console.error('Upload failed:', error)
      toast({
        title: 'Upload failed',
        description:
          error instanceof Error
            ? error.message
            : 'There was a problem uploading your image. Please try again.',
        variant: 'destructive',
      })

      return null
    } finally {
      setIsUploading(false)
    }
  }

  return { upload, isUploading }
}
