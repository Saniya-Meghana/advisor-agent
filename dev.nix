{ pkgs, ... }: {
  packages = [
    pkgs.terraform
    pkgs.python3
    pkgs.python3Packages.pip
  ];

  services.docker.enable = true;
}
