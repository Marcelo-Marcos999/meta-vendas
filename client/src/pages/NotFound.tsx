import { Link } from "wouter";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <h1 className="text-4xl font-bold mb-2">404</h1>
          <p className="text-muted-foreground mb-6">Página não encontrada</p>
          <Link href="/">
            <Button data-testid="button-go-home">Voltar ao início</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
