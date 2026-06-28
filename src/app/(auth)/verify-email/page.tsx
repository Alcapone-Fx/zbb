import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Verifica tu email</CardTitle>
        <CardDescription>
          Te enviamos un enlace de verificación. Revisa tu bandeja de entrada y
          haz clic en el enlace para activar tu cuenta.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Link href="/login" className="w-full">
          <Button variant="outline" className="w-full">
            Volver al inicio de sesión
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
