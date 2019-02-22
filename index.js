require('dotenv').config()
const express = require('express')
const userRoutes = require('./data/routes/userRoutes')
// const schoolRoutes = require('./')
// const loginRoutes = require('./data/routes/loginRoutes')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const mwConfig = require('./data/mwConfig')
const db = require('./data/dbConfig.js')

const PORT = process.env.PORT || 5000
const server = express()
server.use(express.json())

mwConfig(server)

const { authenticate, generateToken } = require('./data/auth/authenticate')

//AUTH ENDPOINTS

server.post('/api/register', (req, res) => {
	const user = req.body
	if (
		!user.username ||
		typeof user.username !== 'string' ||
		user.username === ''
	) {
		res.status(400).json({ message: 'Username must be a valued string.' })
	} else if (
		!user.password ||
		typeof user.password !== 'string' ||
		user.password === ''
	) {
		res.status(400).json({
			message: 'Password must be a valued string of 8 characters or more.'
		})
	} else {
		const creds = req.body
		const hash = bcrypt.hashSync(creds.password, 12)
		creds.password = hash
		db('users')
			.insert(creds)
			.then(id => {
				res.status(201).json({ id: id[0] })
			})
			.catch(() => {
				res.status(500).json({ error: 'Unable to register user.' })
			})
	}
})

server.post('/api/login', (req, res) => {
	const creds = req.body
	db('users')
		.where({ username: creds.username })
		.first()
		.then(user => {
			if (user && bcrypt.compareSync(creds.password, user.password)) {
				const token = generateToken(user)
				res
					.status(200)
					.json({ message: `${user.username} is logged in`, token, id:user.id, })
			} else {
				res.status(401).json({ message: 'You shall not pass!' })
			}
		})
		.catch(() =>
			res.status(500).json({ message: 'Please try logging in again.' })
		)
})

// USERS ENDPOINTS
server.get('/api/users', authenticate, (req, res) => {
	db('users')
		.select('username', 'role', 'school_id')
		.then(users => {
			res.json({ users, decodedToken: req.decodedToken })
		})
		.catch(() => {
			res.status(500).json({ message: 'You shall not pass!' })
		})
})

// server.get('/api/users/:id', (req, res) => {
// 	const { id } = req.params
// 	db('users')
// 		.where({ id })
// 		.then(users => {
// 			res.json(users)
// 		})
// 		.catch(() => {
// 			res.status(500).json({
// 				error: 'Could not find the user in the database.'
// 			})
// 		})
// })

server.get('/api/users/:id', (req, res) => {
	const { id } = req.params
	db('users')
	  .where('users.school_id', id)
	  .then(user => {
		const thisUser = user[0]
		db('issues')
		  .select()
		  .where('issues.school_id', id)
		  .then(issues => {
			if (!thisUser) {
			  res.status(404).json({ err: 'invalid user id' })
			} else {
			  res.json({
				id: thisUser.id,
				name: thisUser.username,
				role: thisUser.role,
				password: thisUser.password,
				school_id: thisUser.school_id,
				issues: issues
			  })
			}
		  })
	  })
	  .catch(() => {
		res
		  .status(404)
		  .json({ error: 'Info about this user could not be retrieved.' })
	  })
  })

server.put('/api/users/:id', (req, res) => {
	const { id } = req.params
	const user = req.body
	db('users')
		.where({ id })
		.update(user)
		.then(rowCount => {
			res.status(200).json(rowCount)
		})
		.catch(() => {
			res
				.status(500)
				.json({ error: 'Failed to update information about this user.' })
		})
})

server.delete('/api/users/:id', (req, res) => {
	const { id } = req.params
	db('users')
		.where({ id })
		.del()
		.then(count => {
			if (count) {
				res.json({
					message: 'The user was successfully deleted from the database.'
				})
			} else {
				res.status(404).json({
					error:
						'The user with the specified id does not exist in the database.'
				})
			}
		})
		.catch(err => {
			res
				.status(500)
				.json({ error: 'The user could not be removed from the database.' })
		})
})

//SCHOOL ENPOINTS
server.get('/api/schools', (req, res) => {
	db('schools')
		.select('school_name', 'country', 'city', 'address')
		.then(schools => {
			res.json(schools)
		})
		.catch(() => {
			res
				.status(500)
				.json({ message: 'Could not retrieve information about these schools' })
		})
})

server.get('/api/schools/:id', (req, res) => {
	const { id } = req.params
	db('schools')
	  .where('schools.id', id)
	  .then(school => {
		const thisSchool = school[0]
		db('issues')
		  .select()
		  .where('issues.school_id', id)
		  .then(issues => {
			if (!thisSchool) {
			  res.status(404).json({ err: 'invalid school id' })
			} else {
			  res.json({
				id: thisSchool.id,
				name: thisSchool.school_name,
				country: thisSchool.country,
				city: thisSchool.city,
				issues: issues
			  })
			}
		  })
	  })
	  .catch(() => {
		res
		  .status(404)
		  .json({ error: 'Info about this school could not be retrieved.' })
	  })
  })

server.post('/api/schools', (req, res) => {
	const school = req.body
	if (school.school_name && school.country && school.city && school.address) {
		db('schools')
			.insert(school)
			.then(ids => {
				res.status(201).json(ids)
			})
			.catch(() => {
				res
					.status(500)
					.json({ error: 'Failed to insert the school into the database' })
			})
	} else {
		res
			.status(400)
			.json({ error: 'Please provide a name and full address for the school' })
	}
})

server.put('/api/schools/:id', (req, res) => {
	const { id } = req.params
	const school = req.body
	db('schools')
		.where({ id })
		.update(school)
		.then(school => {
			res.status(200).json(school)
		})
		.catch(() => {
			res
				.status(500)
				.json({ error: 'Failed to update information about this school.' })
		})
})

server.delete('/api/schools/:id', (req, res) => {
	const { id } = req.params
	db('schools')
		.where({ id })
		.del()
		.then(count => {
			if (count) {
				res.json({
					message: 'The school was successfully deleted from the database.'
				})
			} else {
				res.status(404).json({
					error:
						'The school with the specified id does not exist in the database.'
				})
			}
		})
		.catch(err => {
			res
				.status(500)
				.json({ error: 'The school could not be removed from the database.' })
		})
})

//ISSUE ENPOINTS
server.get('/api/issues', (req, res) => {
	db('issues')
		.select(
			'issue_name',
			'issue_type',
			'created_at',
			'is_resolved',
			'date_resolved',
			'resolved_by',
			'is_scheduled',
			'ignored',
			'comments',
			'school_id',
			'user_id'
		)
		.then(issues => {
			res.json(issues)
		})
		.catch(() => {
			res
				.status(500)
				.json({ message: 'Cannot retrieve information about these issues.' })
		})
})

server.get('/api/issues/:id', (req, res) => {
	const { id } = req.params
	db('issues')
		.where({ id })
		.then(issues => {
			res.json(issues)
		})
		.catch(() => {
			res.status(500).json({
				error: 'Could not find the issue in the database.'
			})
		})
})

server.post('/api/issues', (req, res) => {
	const issue = req.body
	if (
		issue.issue_name &&
		issue.issue_type &&
		issue.is_resolved &&
		issue.ignored &&
		issue.comments 
	) {
		db('issues')
			.insert(issue)
			.then(ids => {
				res.status(201).json(ids)
			})
			.catch(() => {
				res
					.status(500)
					.json({ error: 'Failed to insert the issue into the database' })
			})
	} else {
		res.status(400).json({ error: 'Please provide all required fields' })
	}
})

server.put('/api/issues/:id', (req, res) => {
	const { id } = req.params
	const issue = req.body
	db('issues')
		.where({ id })
		.update(issue)
		.then(issue => {
			res.status(200).json(issue)
		})
		.catch(() => {
			res
				.status(500)
				.json({ error: 'Failed to update information about this issue.' })
		})
})

server.delete('/api/issues/:id', (req, res) => {
	const { id } = req.params
	db('issues')
		.where({ id })
		.del()
		.then(issue => {
			if (issue) {
				res.json({
					message: 'The issue was successfully deleted from the database.'
				})
			} else {
				res.status(404).json({
					error:
						'The issue with the specified id does not exist in the database.'
				})
			}
		})
		.catch(err => {
			res
				.status(500)
				.json({ error: 'The issue could not be removed from the database.' })
		})
})

server.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`)
})
