const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const color = require('colors')
const fs = require('fs');


const app = express();
const port = process.env.PORT || 2050;

const db = new sqlite3.Database('./db/data.db')

db.exec('pragma foreign_keys = ON')

db.exec(`create table if not exists account (
    id integer unique not null primary key autoincrement,
    user varchar(40) not null unique,
    pass varchar(40) not null)`)

db.exec(`create table if not exists session (
    id integer not null unique,
    session varchar(12) not null unique,
    foreign key (id) references account (id) on delete cascade on update cascade)`)

app.use(express.static('static'))
app.use(bodyParser.urlencoded({extended:true}))

app.listen(port, ()=>{
    console.log(`App running on port ${port}`);
})


const insertRow = (table, data, cb) => {
    let keys = Object.keys(data);
    let values = Object.values(data);

    db.run(`insert into ${table} (${keys.join(',')}) values (${Array(values.length).fill('?').join(',')})`, values, (err)=>{
        if (err) throw err
        cb()
    })
}

const searchAll = (table, data, cb) => {
    let keys = Object.keys(data);
    let values = Object.values(data);

    db.all(`select * from ${table} ${keys.length>0?'where':''} ${keys.map(x=>`${x}=?`).join(' and ')}`, values, (err, rows)=>{
        if (err) throw err;
        cb(rows);
    })
}

function getSession(user, pass, res, ses) {
    if (!ses) {
        let session = Math.round(Math.random()*3)+1;

        // ! Change back (A larger random number)

        searchAll('session', {session: session}, (rows)=>{
            if (rows.length >= 1) {
                getSession(user, pass, res, ses);
                return
            }
            else {
                searchAll('account', {user: user}, (r)=>{
                    let row = r[0];
                    let id = row.id;
                    searchAll('session', {id: id}, (rs)=>{
                        if (rs.length >= 1) {
                            db.run('update session set session=? where id=?', [session, id], (err)=>{
                                if (err) throw err;
                                res.send({success: true, session: session})
                                console.log(`Login - (user: ${user}, pass: ${pass})`.green)
                                return
                            })
                        }
                        else {
                            insertRow('session', {id: id, session: session}, ()=>{
                                res.send({success: true, session: session})
                                    console.log(`Login - (user: ${user}, pass: ${pass})`.green)
                                return
                            })
                        }
                    })
                })
            }
        })
    }
    else {
        let session = Math.round(Math.random()*3+1);

        // ! Change back (A larger random number)

        searchAll('session', {session: session}, (rows)=>{
            if (rows.length >= 1) {
                getSession(user, pass, res, ses);
                return;
            }
            else {
                searchAll('session', {session: ses}, (r)=>{
                    let id = r[0].id;
                    db.run('update session set session=? where id=?', [session, id], (err)=>{
                        if (err) throw err;
                        res.send(JSON.stringify({success: true, session: session}));
                        console.log(`Login - (session: ${ses})`.green)
                        return;
                    })
                })
            }
        })
    }
}

function fromSes(ses, cb) {
    if (!ses) {
        cb(null);
    }
    else {
        searchAll('session', {session: ses}, (rows)=>{
            if (rows.length >= 1) {
                let row = rows[0];
                cb(row.id);
            }
            else {
                cb(null);
            }
        })
    }
}

/*
Error codes:
0: Empty user or pass
1: Wrong user or pass
*/

app.post('/login',(req, res)=>{
    let body = req.body;

    if (body.session) {
        searchAll('session', {session: body.session}, (rows)=>{
            if (rows.length >= 1) {
                getSession(null, null, res, body.session)
                return;
            }
            else {
                res.send(JSON.stringify({success: false, reason: 4}));
                return;
            }
        })
        return;
    }

    if (!(body.user && body.pass)) {
        res.send({success: false, reason: 0})
        return;
    }

    searchAll('account', {user: body.user, pass: body.pass}, (rows)=>{
        if (rows.length >= 1) {
            getSession(body.user, body.pass, res, null);
        }
        else {
            res.send({success: false, reason: 1})
            return
        }
    })
})

/*
Error codes:
0: User or password is empty
1: Wrong length
2: Username used
*/

app.post('/signup', (req, res)=>{
    let body = req.body;

    if (!(req.body.user && req.body.pass)) {
        res.send(JSON.stringify({success: false, reason: 0}))
        return;
    }

    // if (body.user.length <= 3 || body.user.length > 20 || body.pass.length <= 7 || body.pass.length > 30) {
    //     res.send(JSON.stringify({success: false, reason: 1}))
    //     return;
    // }

    // ! CHANGE BACK (UNCOMMENT)

    searchAll('account', {user: body.user}, (rows)=>{
        if (rows.length <= 0) {
            insertRow('account', {user: body.user, pass: body.pass}, ()=>{
                searchAll('account', {user: body.user}, (rows)=>{
                    let id = rows[0].id;
                    res.send(JSON.stringify({success: true}));
                    console.log(`Signup - (user: ${body.user}, pass: ${body.pass})`.green);
                    return;
                })
            })
        }
        else {
            res.send(JSON.stringify({success: false, reason: 2}))
            return;
        }
    })
})