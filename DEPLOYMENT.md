# Thesis Craft Mentors: AWS EC2 Deployment Guide

Static website (`index.html` + `assets/`) ko AWS EC2 (free tier) par Nginx ke saath deploy karne aur apni domain map karne ka poora procedure.

`yourdomain.com` ki jagah apni asli domain likhein. `ELASTIC_IP` ki jagah apna Elastic IP likhein. Commands Windows PowerShell ke hisaab se hain.

---

## Step 0: Free tier ke baare mein

- **Account 15 July 2025 ke baad bana hai:** AWS credits (lagbhag $100-200, 6 mahine) deta hai. Credits khatam ya 6 mahine poore hone par charge lagta hai.
- **Purana account hai:** 12 mahine tak 750 ghante/mahina t2.micro ya t3.micro free milta hai.
- **Public IPv4 ka charge:** AWS ab har public IP ka lagbhag $0.005/ghanta (~$3.6/mahina) leta hai. Purane free tier account mein 750 ghante free hain, lekin credits wale account mein yeh credits se kat sakta hai.
- **Billing alert lazmi lagayein:** Billing -> Budgets mein $1-5 ka budget alert bana lein.

---

## Step 1: EC2 instance launch karein

1. AWS Console -> region chunein (Pakistan se Mumbai `ap-south-1` ya Bahrain `me-south-1` nazdeek hain).
2. EC2 -> **Launch instance**.
3. **Name:** `thesiscraftmentors`
4. **AMI:** Ubuntu Server 24.04 LTS.
5. **Instance type:** jo "Free tier eligible" likha ho (t3.micro ya t2.micro).
6. **Key pair:** Create new key pair -> RSA, `.pem` format. Yeh file download hogi, isay sambhal kar rakhein. Dobara download nahi hoti.
7. **Network settings -> Security group:**
   - SSH (22): source **My IP**
   - HTTP (80): Anywhere (`0.0.0.0/0`)
   - HTTPS (443): Anywhere (`0.0.0.0/0`)
8. **Storage:** 8-15 GB gp3 kaafi hai (free tier 30 GB tak deta hai).
9. **Launch instance** dabayein.

---

## Step 2: Elastic IP lagayein

Iske bina instance stop/start par IP badal jata hai aur domain toot jati hai.

1. EC2 -> **Elastic IPs** -> **Allocate Elastic IP address** -> Allocate.
2. Us IP ko select karein -> **Actions -> Associate Elastic IP address** -> apna instance chunein -> Associate.
3. Yeh IP note kar lein (`ELASTIC_IP`).

---

## Step 3: Server se connect karein

PowerShell mein pehle key ki permissions theek karein:

```powershell
icacls "C:\Users\AST\Downloads\mykey.pem" /inheritance:r
icacls "C:\Users\AST\Downloads\mykey.pem" /grant:r "$($env:USERNAME):(R)"
```

Phir connect karein:

```powershell
ssh -i "C:\Users\AST\Downloads\mykey.pem" ubuntu@ELASTIC_IP
```

Pehli baar `yes` likhna hoga.

---

## Step 4: Nginx install karein

Server ke andar:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install nginx -y
sudo mkdir -p /var/www/thesiscraftmentors
sudo chown ubuntu:ubuntu /var/www/thesiscraftmentors
```

Ab `exit` likh kar apne PC par wapas aa jayein.

---

## Step 5: Website files upload karein

Apne PC par PowerShell mein:

```powershell
cd C:\Users\AST\Desktop\thesiscraftmentors
scp -i "C:\Users\AST\Downloads\mykey.pem" -r index.html assets ubuntu@ELASTIC_IP:/var/www/thesiscraftmentors/
```

Sirf `index.html` aur `assets` upload hote hain. `.claude` folder aur `DEPLOYMENT.md` upload nahi karne.

---

## Step 6: Nginx config

Dobara SSH karein aur file banayein:

```bash
sudo nano /etc/nginx/sites-available/thesiscraftmentors
```

Yeh paste karein (`Ctrl+O`, Enter, `Ctrl+X` se save):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/thesiscraftmentors;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Phir enable karein:

```bash
sudo ln -s /etc/nginx/sites-available/thesiscraftmentors /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Ab browser mein `http://ELASTIC_IP` kholein. Website nazar aani chahiye. Agar nahi aati to Security group mein port 80 check karein.

---

## Step 7: Domain map karein (DNS)

### Option A: Registrar ka apna DNS (recommended, free)

Jahan se domain li hai (Namecheap, GoDaddy, wagera) wahan DNS management kholein aur yeh records banayein:

| Type | Host/Name | Value        | TTL       |
|------|-----------|--------------|-----------|
| A    | `@`       | `ELASTIC_IP` | Automatic |
| A    | `www`     | `ELASTIC_IP` | Automatic |

Purane parking ya default A/CNAME records delete kar dein, warna conflict hoga.

### Option B: Route 53

- Route 53 -> Hosted zones -> Create hosted zone (domain ka naam).
- Isme same do A records banayein.
- Hosted zone ke 4 NS (nameserver) records registrar ke panel mein "Custom nameservers" mein daal dein.
- Hosted zone ka charge lagbhag $0.50/mahina hai aur free tier mein nahi aata. Isliye Option A behtar hai.

### DNS check karein

5 minute se 24 ghante lag sakte hain, aksar 10-30 minute:

```powershell
nslookup yourdomain.com
```

Jab jawab mein aapka Elastic IP aa jaye, to `http://yourdomain.com` par site khul jayegi.

---

## Step 8: HTTPS (SSL) lagayein

DNS sahi chalne ke baad server par:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

- Email daalein aur terms accept karein.
- "Redirect HTTP to HTTPS" wala option chunein.
- Auto-renewal khud lag jati hai. Test ke liye: `sudo certbot renew --dry-run`

Ab `https://yourdomain.com` par padlock nazar aayega.

---

## Step 9: Baad mein update karna

Website mein koi change karke sirf Step 5 wali `scp` command dobara chalayein. Nginx restart ki zaroorat nahi.

---

## Aam masail

| Masla | Hal |
|-------|-----|
| IP par site nahi khulti | Security group mein port 80, ya `sudo systemctl status nginx` |
| Domain par nahi khulti lekin IP par khulti hai | DNS abhi propagate nahi hui, ya purana record conflict kar raha hai |
| Certbot fail hota hai | Domain ka A record abhi tak sahi IP par nahi gaya, ya port 80 band hai |
| SSH "Permission denied" | Username `ubuntu` hai (Ubuntu AMI par) aur key ki permissions Step 3 wali hon |
| 403 Forbidden | `sudo chmod -R 755 /var/www/thesiscraftmentors` |

---

## Zaroori baatein

- Instance **Stop** karne par bhi Elastic IP ka charge lagta hai. Poora band karna ho to Elastic IP **Release** karein aur instance **Terminate** karein.
- Launch se pehle website ke **placeholder reviews** badal dein ya hata dein.
- Sirf ek static page ke liye EC2 zaroorat se zyada hai. **S3 + CloudFront** ya **AWS Amplify** sasta aur asaan hota.

---

## Launch checklist

- [ ] Billing budget alert laga diya
- [ ] EC2 instance chal raha hai (Ubuntu 24.04, free tier eligible)
- [ ] Security group: 22 (My IP), 80, 443
- [ ] Elastic IP associate ho gaya
- [ ] Files upload ho gayin, `http://ELASTIC_IP` par site khulti hai
- [ ] DNS A records (`@` aur `www`) Elastic IP par
- [ ] `nslookup` sahi IP dikha raha hai
- [ ] Certbot se HTTPS lag gaya
- [ ] Placeholder reviews hata diye ya badal diye
- [ ] WhatsApp number (`+44 7440 736543`) sahi hai
