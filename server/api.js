const express = require('express');
const router = express.Router();

const mysql = require('mysql');
const crypto = require('crypto');

const path = require('path');
const fs = require('fs');
const upload = require('./uploadMW');
const resizer = require('./resize');
const laporan = require('./laporan_fetch');

const delimg = require('./deleteIMG');

const dotenv = require('dotenv');

dotenv.config({
    path: path.join(__dirname, '..', '.env')
});

console.log('DB_SERVER:', process.env.DB_SERVER);

const connection = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    dateStrings: true
});

connection.getConnection(function (err, conn) {
    if (err) {
        console.error(err);
    } else {
        console.log('Database connected');
        conn.release();
    }
});

//#region REQUEST data operation
router.get('/listRequest/:lim/:ofs', (req, res) => {
    connection.query(`SELECT id_request, tanggal, jam_lapor,
        jam_selesai, isi_request, keterangan, rencanatl, img_name,
        nama_lengkap AS petugas, nama_unit, nama_kategori
        FROM t_request aa
        LEFT JOIN t_user bb ON aa.id_user = bb.id_user
        LEFT JOIN t_unit cc ON aa.id_unit = cc.id_unit
        LEFT JOIN t_kategori dd ON aa.id_kategori = dd.id_kategori
        ORDER BY tanggal DESC, jam_lapor DESC
        LIMIT ? OFFSET ?`,
        [parseInt(req.params.lim), parseInt(req.params.ofs)],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                const data = result;
                res.status(200).send({
                    success: true,
                    data: data
                });
            }
        });
});

router.get('/countRequest', (req, res) => {
    connection.query(`SELECT COUNT(*) AS jml_baris
        FROM t_request`,
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                const data = result;
                res.status(200).send({
                    success: true,
                    data: data
                });
            }
        });
});

router.get('/listRequestPtg/:tgl/:idpetugas', (req, res) => {
    connection.query(`SELECT id_request, jam_lapor, jam_selesai, 
        isi_request, keterangan, rencanatl, nama_unit, img_name,
        nama_kategori
        FROM t_request aa
        LEFT JOIN t_user bb ON aa.id_user = bb.id_user
        LEFT JOIN t_unit cc ON aa.id_unit = cc.id_unit
        LEFT JOIN t_kategori dd ON aa.id_kategori = dd.id_kategori
        WHERE created_at LIKE ?
        AND aa.id_user = ?
        ORDER BY jam_lapor DESC`,
        [req.params.tgl + '%', req.params.idpetugas],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                const data = result;
                res.status(200).send({
                    success: 'true',
                    data: data
                })
            }
        });
});

router.get('/getRequest/:idreq', (req, res) => {
    connection.query(`SELECT id_request, tanggal, jam_lapor,
        jam_selesai, isi_request, keterangan, rencanatl, img_name,
        id_unit, id_user, id_kategori
        FROM t_request
        WHERE id_request = ?`,
        [req.params.idreq],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                const data = result;
                res.status(200).send({
                    success: 'true',
                    data: data
                })
            }
        });
});

router.post('/saveRequestImage', upload.single('image'), async (req, res) => {
    const imgThumbPath = path.join(__dirname, '../public/img-up/thumb');
    const imgPath = path.join(__dirname, '../public/img-up');
    const thumbUpload = new resizer(imgThumbPath, { width: 128, height: 128 });
    const mainUpload = new resizer(imgPath, { width: 1500, height: 1500 });
    let filename = null;
    let filenameMain = null

    if (req.file) {
        filename = await thumbUpload.save(req.file);
        filenameMain = await mainUpload.save(req.file);

        if (filename === filenameMain) {
            fs.unlink(imgPath + '/tmp/' + filename, err => {
                if (err) throw err;
                console.log('deleted temp');
            });
        }

        res.status(200).send({
            success: 'true',
            data: filenameMain
        })
    }

})

router.post('/saveRequest', (req, res) => {
    connection.query(`INSERT INTO t_request (tanggal, jam_lapor, jam_selesai, 
        id_unit, isi_request, keterangan, rencanatl, img_name, id_user, id_kategori) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.body.tanggal, req.body.jam_lapor, req.body.jam_selesai, req.body.id_unit,
        req.body.isi_request, req.body.keterangan, req.body.rencanatl,
        req.body.img_name, req.body.id_user, req.body.id_kategori],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                res.status(200).send({
                    success: 'true'
                })
            }
        });
});

router.put('/updateRequest', (req, res) => {
    connection.query(`UPDATE t_request SET tanggal = ?, jam_lapor = ?, jam_selesai = ?, 
        isi_request = ?, keterangan = ?, rencanatl = ?, img_name = ?, id_unit = ?,
        id_kategori = ? 
        WHERE id_request = ?`,
        [req.body.tanggal, req.body.jam_lapor, req.body.jam_selesai, req.body.isi_request,
        req.body.keterangan, req.body.rencanatl, req.body.img_name, req.body.id_unit,
        req.body.id_kategori,
        req.body.id_request],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                if (req.body.img_name === null) {
                    delimg(req.body.old_img);
                }
                res.status(200).send({
                    success: 'true'
                })
            }
        });
});

router.delete('/deleteRequest/:idreq', (req, res) => {
    console.log(req.body)
    connection.query("DELETE FROM t_request WHERE id_request = ?",
        [req.params.idreq],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                res.status(200).send({
                    success: 'true'
                })
            }
        });
});

router.delete('/deleteRequest/:idreq/:old_img', (req, res) => {
    console.log(req.body)
    connection.query("DELETE FROM t_request WHERE id_request = ?",
        [req.params.idreq],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                res.status(200).send({
                    success: 'true'
                })
                if (req.params.old_img) {
                    delimg(req.params.old_img);
                }
            }
        });
});
//#endregion REQUEST data operation

//#region UNIT data operation
router.get('/listUnit', (req, res) => {
    connection.query(`SELECT id_unit, nama_unit
        FROM t_unit
        WHERE is_aktif = 1`,
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                const data = result;
                res.status(200).send({
                    success: 'true',
                    data: data
                })
            }
        });
});

router.get('/getUnit/:unit_id', (req, res) => {
    connection.query(`SELECT id_unit, nama_unit
        FROM t_unit
        WHERE id_unit = ?`,
        [req.params.unit_id],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                const data = result;
                res.status(200).send({
                    success: 'true',
                    data: data
                })
            }
        });
});

router.post('/saveUnit', (req, res) => {
    connection.query(`INSERT INTO t_unit (nama_unit) 
        VALUES (?)`,
        [req.body.nama_unit],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                res.status(200).send({
                    success: 'true'
                })
            }
        });
});

router.put('/updateUnit', (req, res) => {
    connection.query(`UPDATE t_unit SET nama_unit = ? 
        WHERE id_unit = ?`,
        [req.body.nama_unit, req.body.id_unit],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                res.status(200).send({
                    success: 'true'
                })
            }
        });
});

router.delete('/deleteUnit/:idunit', (req, res) => {
    connection.query("UPDATE t_unit SET is_aktif = 0 WHERE id_unit = ?",
        [req.params.idunit],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                res.status(200).send({
                    success: 'true'
                })
            }
        });
});
//#endregion UNIT data operation

//#region KATEGORI data operation
router.get('/listKategori', (req, res) => {
    connection.query(`SELECT id_kategori, nama_kategori
        FROM t_kategori
        WHERE is_aktif = 1`,
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                const data = result;
                res.status(200).send({
                    success: 'true',
                    data: data
                })
            }
        });
});

router.get('/getKategori/:kategori_id', (req, res) => {
    connection.query(`SELECT id_kategori, nama_kategori
        FROM t_kategori
        WHERE id_kategori = ?`,
        [req.params.kategori_id],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                const data = result;
                res.status(200).send({
                    success: 'true',
                    data: data
                })
            }
        });
});

router.post('/saveKategori', (req, res) => {
    connection.query(`INSERT INTO t_kategori (nama_kategori) 
        VALUES (?)`,
        [req.body.nama_kategori],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                res.status(200).send({
                    success: 'true'
                })
            }
        });
});

router.put('/updateKategori', (req, res) => {
    connection.query(`UPDATE t_kategori SET nama_kategori = ? 
        WHERE id_kategori = ?`,
        [req.body.nama_kategori, req.body.id_kategori],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                res.status(200).send({
                    success: 'true'
                })
            }
        });
});

router.delete('/deleteKategori/:idkategori', (req, res) => {
    connection.query("UPDATE t_kategori SET is_aktif = 0 WHERE id_kategori = ?",
        [req.params.idkategori],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                res.status(200).send({
                    success: 'true'
                })
            }
        });
});
//#endregion KATEGORI data operation

//#region LAPORAN data operation
router.get('/lapHarian/:tgl/:idpetugas', (req, res) => {
    const lap = new laporan()
    const lap_harian = lap.bulanan(req.params.tgl,
        req.params.idpetugas)
    lap_harian.then(result => {
        const data = result;
        res.status(200).send({
            success: true,
            data: data.body
        })
    }).catch(err => {
        res.status(500).send({
            success: false,
            errMsg: err.body.code
        })
        console.error(err);
    })
});

router.get('/lapBulanan/:bln/:idpetugas', (req, res) => {
    const lap = new laporan()
    const lap_bulanan = lap.bulanan(req.params.bln,
        req.params.idpetugas)
    lap_bulanan.then(result => {
        const data = result;
        res.status(200).send({
            success: true,
            data: data.body
        })
    }).catch(err => {
        res.status(500).send({
            success: false,
            errMsg: err.body.code
        })
        console.error(err);
    })
});

router.get('/lapTriwulan/:thn/:triw/:idpetugas', (req, res) => {
    const lap = new laporan()
    const lap_triwulan = lap.triwulan(req.params.thn,
        req.params.triw, req.params.idpetugas)
    lap_triwulan.then(result => {
        const data = result;
        res.status(200).send({
            success: true,
            data: data.body
        })
    }).catch(err => {
        res.status(500).send({
            success: false,
            errMsg: err.body.code
        })
        console.error(err);
    })
});
//#endregion LAPORAN data operation

//#region USER data operation
router.post('/login', (req, res) => {
    const pwd = crypto.createHash('md5').update(req.body.psword).digest("hex");
    connection.query(`SELECT id_user, username, nama_lengkap, level
        FROM t_user
        WHERE username = ? AND psword = ? AND is_aktif = 1
        LIMIT 1`,
        [req.body.username, pwd],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                const data = result;

                if (data.length !== 0) {
                    res.status(200).send({
                        success: true,
                        data: data
                    })
                } else {
                    res.status(403).send({
                        success: false,
                        data: 'Tidak ditemukan pengguna'
                    })
                }
            }
        });
});

router.get('/listUsers', (req, res) => {
    connection.query("SELECT id_user, username, nama_lengkap, level FROM t_user",
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                const data = result;
                res.status(200).send({
                    success: 'true',
                    data: data
                })
            }
        });
});

router.get('/getUser/:user_id', (req, res) => {
    connection.query(`SELECT id_user, username, nama_lengkap, level
        FROM t_user
        WHERE id_user = ?`,
        [req.params.user_id],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                const data = result;
                res.status(200).send({
                    success: 'true',
                    data: data
                })
            }
        });
});

router.post('/saveUser', (req, res) => {
    const pwd = crypto.createHash('md5').update(req.body.psword).digest("hex");
    connection.query(`INSERT INTO t_user (username, nama_lengkap, psword, level) 
        VALUES (?, ?, ?, ?)`,
        [req.body.username, req.body.nama_lengkap, pwd, req.body.level],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                res.status(200).send({
                    success: 'true'
                })
            }
        });
});

router.put('/updateUser', (req, res) => {
    const sent_pwd = req.body.psword;
    let pwd = "";
    let pwd_par = "";

    if (sent_pwd) {
        pwd = crypto.createHash('md5').update(req.body.psword).digest("hex");
        pwd_par = `, psword = '${pwd}'`;
    }

    connection.query(`UPDATE t_user SET username = ?, nama_lengkap = ?, level = ? ${pwd_par} 
        WHERE id_user = ?`,
        [req.body.username, req.body.nama_lengkap, req.body.level, req.body.id_user],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                res.status(200).send({
                    success: 'true'
                })
            }
        });
});

router.delete('/deleteUser/:iduser', (req, res) => {
    connection.query("UPDATE t_user SET is_aktif = 0 WHERE id_user = ?",
        [req.params.iduser],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                res.status(200).send({
                    success: 'true'
                })
            }
        });
});
//#endregion USER data operation

//#region CHART data operation
router.get('/top3Petugas/:bln', (req, res) => {
    connection.query(`SELECT COUNT(*) AS kontribusi, nama_lengkap
    FROM t_request aa
    LEFT JOIN t_user bb ON aa.id_user = bb.id_user
    WHERE tanggal LIKE ?
    GROUP BY aa.id_user
    ORDER BY kontribusi DESC`,
        [req.params.bln + '%'],
        function (err, result) {
            if (err) {
                res.status(500).send({
                    success: false,
                    errMsg: err.code
                })
                console.error(err);
            } else {
                const data = result;
                res.status(200).send({
                    success: 'true',
                    data: data
                })
            }
        });
});
//#endregion CHART data operation

module.exports = router;