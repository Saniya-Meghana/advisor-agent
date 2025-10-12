{ pkgs, ... }: {
  packages = [
    pkgs.terraform
    pkgs.python3
    pkgs.python3Packages.pip
    pkgs.python3Packages.fastapi
    pkgs.python3Packages.uvicorn
    pkgs.python3Packages.python-multipart
    pkgs.python3Packages.openai
    pkgs.python3Packages.reportlab
    pkgs.python3Packages.pdfplumber
    pkgs.nodejs
    pkgs.npm
    pkgs.supabase-cli
  ];

  services.docker.enable = true;
}
