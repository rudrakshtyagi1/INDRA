# FloodLab AWS Deployment Architecture

## Architecture Overview

```
[Users / Emergency Responders]
             |
     [Amazon CloudFront]
             |
       [Amazon S3] (Frontend Vite Static Assets)
             |
    [Application Load Balancer]
             |
   [AWS ECS Fargate Cluster]
   - FastAPI Backend Task
   - DualSPHysics Worker Task (GPU g4dn.xlarge if available)
   - Delft3D FM Worker Task (c6i.2xlarge compute-optimised)
   - Satellite Surveillance Task
             |
   +---------+---------+---------+
   |                   |         |
[Amazon RDS]      [Amazon S3] [Amazon ElastiCache]
(PostgreSQL 16    (Simulations (Redis for Celery
 + PostGIS)        Storage)     & task broker)
```
