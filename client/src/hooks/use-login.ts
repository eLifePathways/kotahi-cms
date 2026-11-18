import { useMutation } from '@tanstack/react-query'
import { useTRPC, type RouterInputs, type RouterOutputs } from '../utils/trpc'

type LoginInput = RouterInputs['login']
type LoginOutput = RouterOutputs['login']

type UseLoginProps = {
  onSuccess?: (data: LoginOutput, variables: LoginInput) => Promise<any> | void
  onError?: (
    error: { message: string },
    variables: LoginInput,
  ) => Promise<any> | void
}

const useLogin = ({ onSuccess, onError }: UseLoginProps) => {
  const trpc = useTRPC()

  return useMutation(
    trpc.login.mutationOptions({
      onSuccess: (data, variables) => onSuccess?.(data, variables),
      onError: (error, variables) => onError?.(error, variables),
    }),
  )
}

export default useLogin
