# ============================================
# PLATFORM SETTINGS ENDPOINTS
# Add this code to the END of your server.py file
# (Before the final "if __name__" block if any)
# ============================================

@api_router.get("/admin/platform-settings")
async def get_platform_settings(current_user: dict = Depends(require_admin)):
    """Get platform settings (Admin only)"""
    settings = await db.platform_settings.find_one({"_id": "main"})
    if not settings:
        return {
            "stripe_publishable_key": "",
            "stripe_secret_key_masked": "",
            "stripe_webhook_secret_masked": "",
            "stripe_test_mode": True,
            "smtp_voting": {
                "host": "", "port": 587, "username": "", "password_set": False,
                "from_email": "noreply@glowingstar.vote", "from_name": "Glowing Star Voting", "use_tls": True
            },
            "smtp_user": {
                "host": "", "port": 587, "username": "", "password_set": False,
                "from_email": "noreply@glowingstar.net", "from_name": "Glowing Star Contest", "use_tls": True
            },
            "vote_packages": [
                {"name": "Starter Pack", "votes": 10, "price": 500, "popular": False},
                {"name": "Support Pack", "votes": 50, "price": 2000, "popular": True},
                {"name": "Champion Pack", "votes": 100, "price": 3500, "popular": False},
                {"name": "Ultimate Pack", "votes": 500, "price": 15000, "popular": False},
            ]
        }
    
    return {
        "stripe_publishable_key": settings.get("stripe_publishable_key", ""),
        "stripe_secret_key_masked": "••••••" + settings.get("stripe_secret_key", "")[-4:] if settings.get("stripe_secret_key") else "",
        "stripe_webhook_secret_masked": "••••••" + settings.get("stripe_webhook_secret", "")[-4:] if settings.get("stripe_webhook_secret") else "",
        "stripe_test_mode": settings.get("stripe_test_mode", True),
        "smtp_voting": {
            **settings.get("smtp_voting", {}),
            "password_set": bool(settings.get("smtp_voting", {}).get("password"))
        },
        "smtp_user": {
            **settings.get("smtp_user", {}),
            "password_set": bool(settings.get("smtp_user", {}).get("password"))
        },
        "vote_packages": settings.get("vote_packages", [])
    }

@api_router.put("/admin/platform-settings")
async def update_platform_settings(settings: dict, current_user: dict = Depends(require_admin)):
    """Update platform settings (Admin only)"""
    existing = await db.platform_settings.find_one({"_id": "main"}) or {}
    
    update_data = {
        "_id": "main",
        "stripe_publishable_key": settings.get("stripe_publishable_key", existing.get("stripe_publishable_key", "")),
        "stripe_test_mode": settings.get("stripe_test_mode", existing.get("stripe_test_mode", True)),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if settings.get("stripe_secret_key") and not settings["stripe_secret_key"].startswith("••"):
        update_data["stripe_secret_key"] = settings["stripe_secret_key"]
    else:
        update_data["stripe_secret_key"] = existing.get("stripe_secret_key", "")
    
    if settings.get("stripe_webhook_secret") and not settings["stripe_webhook_secret"].startswith("••"):
        update_data["stripe_webhook_secret"] = settings["stripe_webhook_secret"]
    else:
        update_data["stripe_webhook_secret"] = existing.get("stripe_webhook_secret", "")
    
    smtp_voting = settings.get("smtp_voting", {})
    existing_smtp_voting = existing.get("smtp_voting", {})
    update_data["smtp_voting"] = {
        "host": smtp_voting.get("host", existing_smtp_voting.get("host", "")),
        "port": smtp_voting.get("port", existing_smtp_voting.get("port", 587)),
        "username": smtp_voting.get("username", existing_smtp_voting.get("username", "")),
        "password": smtp_voting.get("password", existing_smtp_voting.get("password", "")) if smtp_voting.get("password") else existing_smtp_voting.get("password", ""),
        "from_email": smtp_voting.get("from_email", existing_smtp_voting.get("from_email", "noreply@glowingstar.vote")),
        "from_name": smtp_voting.get("from_name", existing_smtp_voting.get("from_name", "Glowing Star Voting")),
        "use_tls": smtp_voting.get("use_tls", existing_smtp_voting.get("use_tls", True)),
    }
    
    smtp_user = settings.get("smtp_user", {})
    existing_smtp_user = existing.get("smtp_user", {})
    update_data["smtp_user"] = {
        "host": smtp_user.get("host", existing_smtp_user.get("host", "")),
        "port": smtp_user.get("port", existing_smtp_user.get("port", 587)),
        "username": smtp_user.get("username", existing_smtp_user.get("username", "")),
        "password": smtp_user.get("password", existing_smtp_user.get("password", "")) if smtp_user.get("password") else existing_smtp_user.get("password", ""),
        "from_email": smtp_user.get("from_email", existing_smtp_user.get("from_email", "noreply@glowingstar.net")),
        "from_name": smtp_user.get("from_name", existing_smtp_user.get("from_name", "Glowing Star Contest")),
        "use_tls": smtp_user.get("use_tls", existing_smtp_user.get("use_tls", True)),
    }
    
    if settings.get("vote_packages"):
        update_data["vote_packages"] = settings["vote_packages"]
    else:
        update_data["vote_packages"] = existing.get("vote_packages", [])
    
    await db.platform_settings.replace_one({"_id": "main"}, update_data, upsert=True)
    
    global STRIPE_API_KEY
    if update_data.get("stripe_secret_key"):
        STRIPE_API_KEY = update_data["stripe_secret_key"]
    
    return {"success": True, "message": "Settings updated successfully"}

