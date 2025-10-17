{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    (python3.withPackages (ppkgs: with ppkgs; [
      pip
      transformers
      datasets
      accelerate
      torch
      scikit-learn
    ]))
    supabase-cli
    docker-compose
    docker
  ];
}
