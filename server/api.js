const express = require('express');
const router = express.Router();

const mysql = require('mysql');
const crypto = require('crypto');

require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
connection.connect(function (err) {
    err ? console.error(err) 
        : console.log('Database connected')
});

//#region REQUEST data operation
// router.get('/listUsers', (req, res) => {
//     connection.query("SELECT id, username, nama, email FROM users",
//         function (err, result) {
//             if (err) throw err;
//             const data = result;
//             res.status(200).send({
//                 success: 'true',
//                 data: data
//             })
//         });
// });

// router.get('/getUser/:user_id', (req, res) => {
//     connection.query(`SELECT *
//         FROM users
//         WHERE id = ?`,
//         [req.params.user_id],
//         function (err, result) {
//             if (err) throw err;
//             const data = result;
//             res.status(200).send({
//                 success: 'true',
//                 data: data
//             })
//     });
// });

router.post('/saveRequest', (req, res) => {
    connection.query(`INSERT INTO t_request (tanggal, jam, isi_request, keterangan, id_user) 
        VALUES (?, ?, ?, ?, ?)`, 
        [req.body.tanggal, req.body.jam, req.body.isi_request, req.body.keterangan, req.body.id_user],
        function (err, result) {
            if (err) console.error(err);
            res.status(200).send({
                success: 'true'
            })
        });
});

// router.put('/updateUser', (req, res) => {
//     connection.query(`UPDATE users SET username = ?, nama = ?, email = ?, password = ? 
//         WHERE id = ?`, 
//         [req.body.username, req.body.nama, req.body.email, req.body.password, req.body.id],
//         function (err, result) {
//             if (err) console.error(err);
//             res.status(200).send({
//                 success: 'true'
//             })
//         });
// });

// router.delete('/deleteUser', (req, res) => {
//     connection.query("DELETE FROM users WHERE id = ?", 
//         [req.body.id],
//         function (err, result) {
//             if (err) console.error(err);
//             res.status(200).send({
//                 success: 'true'
//             })
//         });
// });
//#endregion REQUEST data operation

//#region USER data operation
router.post('/login', (req, res) => {
    const pwd = crypto.createHash('md5').update(req.body.psword).digest("hex");
    console.log(pwd)
    connection.query(`SELECT id_user, username, nama_lengkap, level
        FROM t_user
        WHERE username = ? AND psword = ?
        LIMIT 1`,
        [req.body.username, pwd],
        function (err, result) {
            if (err) throw err;
            const data = result;
            res.status(200).send({
                success: 'true',
                data: data
            })
    });
});

router.get('/listUsers', (req, res) => {
    connection.query("SELECT id_user, username, nama_lengkap, level FROM t_user",
        function (err, result) {
            if (err) throw err;
            const data = result;
            res.status(200).send({
                success: 'true',
                data: data
            })
        });
});

router.get('/getUser/:user_id', (req, res) => {
    connection.query(`SELECT id_user, username, nama_lengkap, level
        FROM t_user
        WHERE id_user = ?`,
        [req.params.user_id],
        function (err, result) {
            if (err) throw err;
            const data = result;
            res.status(200).send({
                success: 'true',
                data: data
            })
    });
});

router.post('/saveUser', (req, res) => {
    const pwd = crypto.createHash('md5').update(req.body.psword).digest("hex");
    connection.query(`INSERT INTO t_user (username, nama_lengkap, password, level) 
        VALUES (?, ?, ?, ?)`, 
        [req.body.username, req.body.nama_lengkap, pwd, req.body.level],
        function (err, result) {
            if (err) console.error(err);
            res.status(200).send({
                success: 'true'
            })
        });
});

router.put('/updateUser', (req, res) => {
    const sent_pwd = req.body.psword;
    let pwd = "";
    let pwd_par = "";

    if (sent_pwd.trim().length !== 0) {
        pwd = crypto.createHash('md5').update(req.body.psword).digest("hex");
        pwd_par = `, psword = ${pwd}`;
    }

    connection.query(`UPDATE t_user SET username = ?, nama_lengkap = ?, level = ? ${pwd_par} 
        WHERE id_user = ?`, 
        [req.body.username, req.body.nama_lengkap, req.body.psword, req.body.id_user],
        function (err, result) {
            if (err) console.error(err);
            res.status(200).send({
                success: 'true'
            })
        });
});

router.delete('/deleteUser', (req, res) => {
    connection.query("DELETE FROM t_user WHERE id_user = ?", 
        [req.body.id_user],
        function (err, result) {
            if (err) console.error(err);
            res.status(200).send({
                success: 'true'
            })
        });
});
//#endregion USER data operation

module.exports = router;