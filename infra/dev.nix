{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.terraform
    # add other packages here if needed
  ];
}
