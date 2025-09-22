#!/bin/bash

# Ensure all parent directories exist
mkdir -p deploy/k8s-manifests
mkdir -p infra
mkdir -p .github/workflows

# ---------------- Dockerfiles ----------------
cat > Dockerfile.frontend << 'EOF'
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

cat > Dockerfile.functions << 'EOF'
FROM node:20-alpine
WORKDIR /functions
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 54321
CMD ["node", "index.js"]
EOF

# ---------------- Kubernetes Manifests ----------------
cat > deploy/k8s-manifests/frontend-deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: your-dockerhub-username/frontend:latest
        ports:
        - containerPort: 80
EOF

cat > deploy/k8s-manifests/backend-deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-dockerhub-username/functions:latest
        ports:
        - containerPort: 54321
EOF

cat > deploy/k8s-manifests/service.yaml << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
EOF

cat > deploy/argo-app.yaml << 'EOF'
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: advisor-agent
spec:
  project: default
  source:
    repoURL: 'https://github.com/your-username/advisor-agent.git'
    targetRevision: HEAD
    path: deploy/k8s-manifests
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
EOF

# ---------------- Terraform ----------------
cat > infra/main.tf << 'EOF'
provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_iam_role" "eks_role" {
  name = "eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_eks_cluster" "cluster" {
  name     = "advisor-agent-cluster"
  role_arn = aws_iam_role.eks_role.arn
  vpc_config {
    subnet_ids = [aws_subnet.public.id]
  }
}
EOF

cat > infra/outputs.tf << 'EOF'
output "vpc_id" {
  value = aws_vpc.main.id
}

output "eks_cluster_name" {
  value = aws_eks_cluster.cluster.name
}
EOF

cat > infra/variables.tf << 'EOF'
variable "region" {
  default = "us-east-1"
}
EOF

# ---------------- Security Scans ----------------
cat > syft.yaml << 'EOF'
# Syft SBOM configuration
# Add your Syft scanning configuration here
EOF

cat > trivy.yaml << 'EOF'
# Trivy scanning configuration
# Add your Trivy scanning configuration here
EOF

# ---------------- GitHub Actions ----------------
cat > .github/workflows/ci.yml << 'EOF'
name: CI
on: [push, pull_request]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
    - run: npm install
    - run: npm run lint
    - run: npm test
    - name: Syft SBOM
      run: syft packages dir:. -o json > sbom.json
    - name: Trivy Scan
      run: trivy fs --exit-code 1 .
EOF

cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy
on:
  push:
    branches:
      - main

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v2
      with:
        terraform_version: 1.7.6
    - name: Terraform Init
      run: terraform -chdir=infra init
    - name: Terraform Apply
      run: terraform -chdir=infra apply -auto-approve
    - name: ArgoCD Sync
      run: |
        argocd app sync advisor-agent
EOF

echo "✅ All empty files have been populated successfully!"
