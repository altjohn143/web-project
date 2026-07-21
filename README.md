# ClaraCare Clinic Management System

A Create React App + Express + MongoDB clinic management system based on the ADVWEBDEV project requirements.

## Project structure

This is a single MERN repository containing both applications:

```text
web-project/
├── clinic-management-client/  # React frontend
└── server/                    # Express and MongoDB backend
```

## Run locally

1. Start MongoDB locally (or update `server/.env` with a MongoDB Atlas connection string).
2. Run `npm run dev` inside `server`.
3. Run `npm start` inside `clinic-management-client`.

The React app opens at `http://localhost:3000`; the API runs at `http://localhost:5000`.

## Included

- Responsive dashboard, appointments, search, and CRUD-ready UI
- React Router, hooks, reusable components, and form handling
- Express REST API with MongoDB/Mongoose models
- JWT authentication, bcrypt password hashing, Helmet, rate limiting, CORS, and validation
- Paginated and searchable appointment endpoints

## Deployment

- Vercel frontend root directory: `clinic-management-client`
- Render backend root directory: `server`
