# BlogSpace — Blog Platform with Comments

A full-stack blogging platform where users can register, write posts, and comment, built as an internship project for Thiranex.

## Features
- User registration, login and authentication (JWT, bcrypt-hashed passwords)
- Create, edit and delete blog posts (authors can only change their own posts; admins can moderate)
- Comment section for user interaction (logged-in users can comment and delete their own comments)
- RESTful backend APIs built with Node.js and Express
- MongoDB database integration using Mongoose
- Responsive interface for desktop and mobile

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Auth:** JSON Web Tokens (JWT), bcryptjs

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local install) or a free MongoDB Atlas cluster

### Installation
1. Clone this repository
   `git clone https://github.com/Janarthanan-8/blog-platform.git`
2. Install dependencies
   `cd blog-platform`
   `npm install`
3. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`
4. Start the server: `npm start`
5. Open `http://localhost:3000`

On first run the app creates a sample post and an admin account: `admin@blog.com` / `admin123` (change before deploying).

## API Endpoints
| Method | Endpoint | Access |
|---|---|---|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/posts | Public |
| GET | /api/posts/:id (post + comments) | Public |
| POST | /api/posts | Logged-in user |
| PUT / DELETE | /api/posts/:id | Author or admin |
| POST | /api/posts/:id/comments | Logged-in user |
| DELETE | /api/comments/:id | Comment author or admin |

## Live Demo
[Add your deployed link here]

## Learning Outcomes
Hands-on full-stack development with content management features (CRUD), authentication and authorization, and user interaction through comments.
