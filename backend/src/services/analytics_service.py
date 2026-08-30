import os
import sqlite3
import datetime
import random

class AnalyticsService:
    def __init__(self):
        # Create storage folder if it doesn't exist
        self.db_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage"))
        os.makedirs(self.db_dir, exist_ok=True)
        self.db_path = os.path.join(self.db_dir, "analytics.db")
        self._init_db()

    def _init_db(self):
        """Initialize SQLite tables for analytics."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create page views table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS page_views (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT,
                session_id TEXT,
                ip TEXT,
                user_agent TEXT,
                country TEXT,
                city TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create clicks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clicks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT,
                element_id TEXT,
                session_id TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create searches table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS searches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT,
                search_type TEXT,
                session_id TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        conn.close()

    def log_page_view(self, path, session_id, ip, user_agent):
        """Log a page view event with simulated geo-demographics."""
        # Simulated locations list to populate interactive analytics dashboard
        locations = [
            ("United States", "San Francisco"),
            ("United States", "New York"),
            ("United States", "Seattle"),
            ("United Kingdom", "London"),
            ("Germany", "Berlin"),
            ("India", "Bangalore"),
            ("India", "Mumbai"),
            ("Canada", "Toronto"),
            ("Singapore", "Singapore"),
            ("Australia", "Sydney")
        ]
        
        # Default geo-data
        country, city = "Local Host", "Local Server"
        
        # Simulate global visitor locations if running locally
        if ip in ("127.0.0.1", "localhost", "::1"):
            # Seed based on session_id to keep visitor location consistent per session
            if session_id:
                random.seed(session_id)
            country, city = random.choice(locations)
            # Reset random seed
            random.seed(None)

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO page_views (path, session_id, ip, user_agent, country, city) VALUES (?, ?, ?, ?, ?, ?)",
            (path, session_id, ip, user_agent, country, city)
        )
        conn.commit()
        conn.close()

    def log_click(self, path, element_id, session_id):
        """Log a user click event on the UI."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO clicks (path, element_id, session_id) VALUES (?, ?, ?)",
            (path, element_id, session_id)
        )
        conn.commit()
        conn.close()

    def log_search(self, query, search_type, session_id):
        """Log a search query."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO searches (query, search_type, session_id) VALUES (?, ?, ?)",
            (query, search_type, session_id)
        )
        conn.commit()
        conn.close()

    def get_analytics_report(self):
        """Generate aggregated report data for dashboard visualizer."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 1. Total page views & unique visits (sessions)
        cursor.execute("SELECT COUNT(*) as total_views, COUNT(DISTINCT session_id) as total_visitors FROM page_views")
        base_stats = dict(cursor.fetchone())
        
        # 2. Page views grouped by path
        cursor.execute("SELECT path, COUNT(*) as count FROM page_views GROUP BY path ORDER BY count DESC")
        views_by_path = [dict(r) for r in cursor.fetchall()]
        
        # 3. Click frequency by element (for Heatmap visualization)
        cursor.execute("SELECT element_id, path, COUNT(*) as count FROM clicks GROUP BY element_id, path ORDER BY count DESC LIMIT 15")
        click_events = [dict(r) for r in cursor.fetchall()]
        
        # 4. Demographics (country and city)
        cursor.execute("SELECT country, COUNT(*) as count FROM page_views GROUP BY country ORDER BY count DESC")
        country_demographics = [dict(r) for r in cursor.fetchall()]
        
        cursor.execute("SELECT city, country, COUNT(*) as count FROM page_views GROUP BY city, country ORDER BY count DESC LIMIT 5")
        city_demographics = [dict(r) for r in cursor.fetchall()]
        
        # 5. Top searches
        cursor.execute("SELECT query, search_type, COUNT(*) as count FROM searches GROUP BY query, search_type ORDER BY count DESC LIMIT 10")
        top_searches = [dict(r) for r in cursor.fetchall()]
        
        # 6. Hourly / Daily trends (last 24 hours / days)
        cursor.execute("""
            SELECT strftime('%Y-%m-%d %H:00', timestamp) as time_slot, COUNT(*) as count 
            FROM page_views 
            GROUP BY time_slot 
            ORDER BY time_slot DESC 
            LIMIT 24
        """)
        hourly_trend = [dict(r) for r in cursor.fetchall()]
        
        conn.close()
        
        return {
            "summary": base_stats,
            "views_by_path": views_by_path,
            "click_events": click_events,
            "demographics": {
                "countries": country_demographics,
                "cities": city_demographics
            },
            "top_searches": top_searches,
            "trend": hourly_trend
        }

# Singleton instance
analytics_service = AnalyticsService()
