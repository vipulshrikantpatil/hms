"""Generates one flowchart PNG/SVG per HMS module, styled like the existing pack."""
import os, subprocess, textwrap
from graphviz import Digraph

OUT = "/home/claude/hospital-management-system/artifacts/flowcharts"
os.makedirs(OUT, exist_ok=True)

STYLE = {
    "start":   dict(shape="oval",     fillcolor="#d5ecd7", color="#5b9c62"),
    "end":     dict(shape="oval",     fillcolor="#d5ecd7", color="#5b9c62"),
    "input":   dict(shape="box",      fillcolor="#cfe2f3", color="#5b8db8"),
    "load":    dict(shape="box",      fillcolor="#fdf0cd", color="#c9a63a"),
    "display": dict(shape="box",      fillcolor="#e4d8f3", color="#8e77b8"),
    "action":  dict(shape="box",      fillcolor="#fbdade", color="#cf8b93"),
    "decision":dict(shape="diamond",  fillcolor="#d7e9f7", color="#5b8db8"),
    "data":    dict(shape="cylinder", fillcolor="#cfe2f3", color="#5b8db8"),
    "error":   dict(shape="box",      fillcolor="#f8ccc8", color="#c96a61"),
}

def wrap(text, width=26):
    return "\\n".join(textwrap.wrap(text, width)) if len(text) > width else text

def build(key, title, nodes, edges, rankdir="TB"):
    g = Digraph(key, format="png")
    g.attr(rankdir=rankdir, bgcolor="white", splines="spline", concentrate="false", nodesep="0.35", ranksep="0.42",
           labelloc="t", label=f"\\n{title}\\n", fontname="Arial", fontsize="20", fontcolor="#1b3a4b")
    g.attr("node", style="filled,rounded", fontname="Arial", fontsize="11",
           fontcolor="#12283a", penwidth="1.4", margin="0.16,0.09")
    g.attr("edge", fontname="Arial", fontsize="9.5", color="#44607a", arrowsize="0.7", penwidth="1.1")
    kinds = {nid: kind for nid, kind, _ in nodes}
    for nid, kind, label in nodes:
        g.node(nid, wrap(label), **STYLE[kind])
    for e in edges:
        src, dst = e[0], e[1]
        label = e[2] if len(e) > 2 else ""
        extra = dict(e[3]) if len(e) > 3 else {}
        # Keep error branches beside their decision instead of pushing the happy path down.
        if kinds.get(dst) == "error" or kinds.get(src) == "error":
            extra.setdefault("constraint", "false")
            extra.setdefault("color", "#c07a72")
        g.edge(src, dst, label=label, **extra)
    g.render(filename=key, directory=OUT, cleanup=True)
    g.format = "svg"
    g.render(filename=key, directory=OUT, cleanup=True)
    print("rendered", key)

CHARTS = []

# 1 ---------------------------------------------------------------- registration
CHARTS.append(("11_patient_registration", "11. Patient Registration Flowchart", [
    ("s","start","Start"),
    ("open","input","User clicks \"Register\" in navbar"),
    ("form","display","Display registration form (login + personal details)"),
    ("fill","input","User enters email, password, confirm password, name, mobile"),
    ("cv","decision","Client validation passes?"),
    ("cerr","error","Popup: show the failing rule"),
    ("post","load","POST /api/auth/register"),
    ("sv","decision","Server validation + email unique?"),
    ("serr","error","Popup: 400 field errors / email already registered"),
    ("save","data","Save User (role PATIENT) + Patient profile"),
    ("jwt","load","Generate JWT and store session"),
    ("ok","action","Success popup + clear the form"),
    ("home","display","Redirect to Home page (logged in)"),
    ("e","end","End"),
], [
    ("s","open"),("open","form"),("form","fill"),("fill","cv"),
    ("cv","cerr","No"),("cerr","fill"),
    ("cv","post","Yes"),("post","sv"),
    ("sv","serr","No"),("serr","fill"),
    ("sv","save","Yes"),("save","jwt"),("jwt","ok"),("ok","home"),("home","e"),
]))

# 2 ---------------------------------------------------------------- login / jwt
CHARTS.append(("12_login_jwt", "12. Login and JWT Authentication Flowchart", [
    ("s","start","Start"),
    ("form","display","Display login form"),
    ("in","input","User enters email and password"),
    ("v","decision","Email format valid?"),
    ("verr","error","Popup: enter a valid email"),
    ("post","load","POST /api/auth/login"),
    ("auth","load","AuthenticationManager checks credentials"),
    ("ok","decision","Credentials correct?"),
    ("fail","error","401 -> popup \"Invalid email or password\""),
    ("token","load","JwtService issues signed token (24h)"),
    ("store","data","Store session in localStorage"),
    ("role","decision","Role = ADMIN?"),
    ("admin","display","Redirect to Admin Dashboard"),
    ("pat","display","Redirect to patient dashboard / saved redirect URL"),
    ("e","end","End"),
], [
    ("s","form"),("form","in"),("in","v"),
    ("v","verr","No"),("verr","in"),
    ("v","post","Yes"),("post","auth"),("auth","ok"),
    ("ok","fail","No"),("fail","in"),
    ("ok","token","Yes"),("token","store"),("store","role"),
    ("role","admin","Yes"),("role","pat","No"),
    ("admin","e"),("pat","e"),
]))

# 3 ---------------------------------------------------------------- guard / interceptor
CHARTS.append(("13_route_guard", "13. Route Guard and Token Interceptor Flowchart", [
    ("s","start","Start"),
    ("nav","input","User navigates to a protected route"),
    ("g","decision","Session present?"),
    ("no","error","Popup \"Login required\" -> redirect to /login?redirect=URL"),
    ("adm","decision","Route needs ADMIN?"),
    ("isadm","decision","Session role = ADMIN?"),
    ("den","error","Popup \"Access denied\" -> /login"),
    ("load","load","Load the routed component"),
    ("req","load","HTTP request leaves the component"),
    ("int","action","Interceptor adds Authorization: Bearer <token>"),
    ("filter","load","JwtAuthenticationFilter validates the token"),
    ("valid","decision","Token valid and not expired?"),
    ("r401","error","401 -> popup, user logs in again"),
    ("data","data","Controller returns the data"),
    ("e","end","End"),
], [
    ("s","nav"),("nav","g"),
    ("g","no","No"),("no","e"),
    ("g","adm","Yes"),
    ("adm","isadm","Yes"),("adm","load","No"),
    ("isadm","den","No"),("den","e"),
    ("isadm","load","Yes"),
    ("load","req"),("req","int"),("int","filter"),("filter","valid"),
    ("valid","r401","No"),("r401","e"),
    ("valid","data","Yes"),("data","e"),
]))

# 4 ---------------------------------------------------------------- booking
CHARTS.append(("14_appointment_booking", "14. Appointment Booking Flowchart (Patient)", [
    ("s","start","Start"),
    ("cta","input","User clicks \"Book\" on a doctor or the CTA"),
    ("auth","decision","Logged in?"),
    ("login","error","Popup \"Login required\" -> /login"),
    ("page","display","Open booking page"),
    ("docs","load","GET /api/public/doctors"),
    ("pick","input","Select doctor and date"),
    ("slots","load","GET /doctors/{id}/slots?date="),
    ("grid","display","Show slot grid (available / booked / past)"),
    ("slot","input","Select an available slot"),
    ("rooms","load","GET /patient/rooms/free?start=&end="),
    ("room","input","Optionally choose a free room, add reason"),
    ("post","load","POST /api/patient/appointments"),
    ("valid","decision","Passes validation and collision checks?"),
    ("err","error","409 / 400 -> popup, reload the slot grid"),
    ("save","data","Save appointment as PENDING + PENDING payment"),
    ("ok","action","Success popup"),
    ("dash","display","Redirect to My Appointments"),
    ("e","end","End"),
], [
    ("s","cta"),("cta","auth"),
    ("auth","login","No"),("login","e"),
    ("auth","page","Yes"),("page","docs"),("docs","pick"),("pick","slots"),
    ("slots","grid"),("grid","slot"),("slot","rooms"),("rooms","room"),("room","post"),
    ("post","valid"),
    ("valid","err","No"),("err","grid"),
    ("valid","save","Yes"),("save","ok"),("ok","dash"),("dash","e"),
]))

# 5 ---------------------------------------------------------------- slot generation
CHARTS.append(("15_slot_generation", "15. Slot Generation Flowchart", [
    ("s","start","Start"),
    ("req","input","Request slots for doctor + date"),
    ("find","data","Load doctor (availableFrom, availableTo, slotMinutes)"),
    ("exist","decision","Doctor exists?"),
    ("nf","error","404 Doctor not found"),
    ("book","data","Load PENDING/APPROVED bookings for that day"),
    ("cur","load","cursor = date + availableFrom"),
    ("loop","decision","cursor + slotMinutes <= availableTo?"),
    ("over","decision","Overlaps a booking or already past?"),
    ("taken","action","Mark slot unavailable"),
    ("free","action","Mark slot available"),
    ("next","load","cursor = slot end"),
    ("ret","display","Return the slot list to the UI"),
    ("e","end","End"),
], [
    ("s","req"),("req","find"),("find","exist"),
    ("exist","nf","No"),("nf","e"),
    ("exist","book","Yes"),("book","cur"),("cur","loop"),
    ("loop","over","Yes"),
    ("over","taken","Yes"),("over","free","No"),
    ("taken","next"),("free","next"),("next","loop"),
    ("loop","ret","No"),("ret","e"),
]))

# 6 ---------------------------------------------------------------- collision
CHARTS.append(("16_collision_validation", "16. Collision Validation Flowchart", [
    ("s","start","Start"),
    ("req","input","Booking or approval request (doctor, room, start, end)"),
    ("win","decision","end > start?"),
    ("werr","error","400 End time must be after start time"),
    ("hours","decision","Inside the doctor's working hours?"),
    ("herr","error","400 Slot is outside working hours"),
    ("doc","data","Query overlapping PENDING/APPROVED rows for the doctor"),
    ("dov","decision","Doctor overlap found?"),
    ("derr","error","409 Doctor already booked in this slot"),
    ("roomq","decision","Room selected?"),
    ("room","data","Query overlapping rows for the room"),
    ("rov","decision","Room overlap found?"),
    ("rerr","error","409 Room is occupied in this slot"),
    ("db","data","Save (Postgres EXCLUDE constraint as final guard)"),
    ("ok","action","Booking accepted"),
    ("e","end","End"),
], [
    ("s","req"),("req","win"),
    ("win","werr","No"),("werr","e"),
    ("win","hours","Yes"),
    ("hours","herr","No"),("herr","e"),
    ("hours","doc","Yes"),("doc","dov"),
    ("dov","derr","Yes"),("derr","e"),
    ("dov","roomq","No"),
    ("roomq","room","Yes"),("roomq","db","No"),
    ("room","rov"),
    ("rov","rerr","Yes"),("rerr","e"),
    ("rov","db","No"),("db","ok"),("ok","e"),
]))

# 7 ---------------------------------------------------------------- approval queue
CHARTS.append(("17_request_queue", "17. Admin Request Queue Flowchart", [
    ("s","start","Start"),
    ("open","input","Admin opens the Request Queue tab"),
    ("load","load","GET /admin/appointments/pending"),
    ("show","display","Show pending requests with room dropdown"),
    ("act","decision","Approve or reject?"),
    ("room","input","Optionally assign a room"),
    ("chk","load","Re-run collision check (excluding this appointment)"),
    ("clash","decision","Clash found?"),
    ("cerr","error","409 popup - pick another room"),
    ("app","data","Status = APPROVED, remarks cleared"),
    ("rem","input","Prompt for mandatory remarks"),
    ("rv","decision","Remarks entered?"),
    ("rerr","error","Popup: remarks are mandatory"),
    ("rej","data","Status = REJECTED, remarks saved"),
    ("ok","action","Success popup, queue reloaded"),
    ("see","display","Patient sees the new status and remarks"),
    ("e","end","End"),
], [
    ("s","open"),("open","load"),("load","show"),("show","act"),
    ("act","room","Approve"),("room","chk"),("chk","clash"),
    ("clash","cerr","Yes"),("cerr","show"),
    ("clash","app","No"),("app","ok"),
    ("act","rem","Reject"),("rem","rv"),
    ("rv","rerr","No"),("rerr","show"),
    ("rv","rej","Yes"),("rej","ok"),
    ("ok","see"),("see","e"),
]))

# 8 ---------------------------------------------------------------- payment
CHARTS.append(("18_payment_receipt", "18. Payment and Receipt Flowchart", [
    ("s","start","Start"),
    ("click","input","Patient clicks Pay on an appointment"),
    ("load","load","Load appointment + amount"),
    ("paid","decision","Already paid?"),
    ("rec","load","GET receipt"),
    ("form","display","Show card form + terms and conditions"),
    ("card","input","Enter holder name, card number, expiry, CVV"),
    ("mask","action","Mask number on blur - only last 4 stay visible"),
    ("agree","decision","\"I agree\" ticked?"),
    ("aerr","error","Popup: accept the terms to continue"),
    ("cv","decision","Card format + Luhn + expiry valid?"),
    ("cerr","error","Popup: fix the card details"),
    ("pay","load","POST /appointments/{id}/pay"),
    ("store","data","Store last4, holder, txn ref, receipt no - never PAN or CVV"),
    ("ok","action","Success popup"),
    ("view","display","Printable receipt view"),
    ("print","input","Print / save as PDF"),
    ("e","end","End"),
], [
    ("s","click"),("click","load"),("load","paid"),
    ("paid","rec","Yes"),("rec","view"),
    ("paid","form","No"),("form","card"),("card","mask"),("mask","agree"),
    ("agree","aerr","No"),("aerr","form"),
    ("agree","cv","Yes"),
    ("cv","cerr","No"),("cerr","form"),
    ("cv","pay","Yes"),("pay","store"),("store","ok"),("ok","view"),
    ("view","print"),("print","e"),
]))

# 9 ---------------------------------------------------------------- cancel / refund
CHARTS.append(("19_cancel_refund", "19. Cancellation and Refund Flowchart", [
    ("s","start","Start"),
    ("click","input","Patient clicks Cancel on an appointment"),
    ("cfm","decision","Confirms the dialog?"),
    ("no","end","No change"),
    ("api","load","PATCH /patient/appointments/{id}/cancel"),
    ("own","decision","Own appointment and not COMPLETED?"),
    ("err","error","400 popup - cannot cancel"),
    ("set","data","Status = CANCELLED"),
    ("pay","decision","Payment status = PAID?"),
    ("ref","load","PaymentService.refund() -> status REFUNDED"),
    ("note","data","Remarks: refund initiated to card ending XXXX, 5-7 working days"),
    ("nonote","data","Remarks: no payment had been collected"),
    ("ok","action","Success popup, list reloaded"),
    ("slot","display","Slot released back to the availability grid"),
    ("e","end","End"),
], [
    ("s","click"),("click","cfm"),
    ("cfm","no","No"),("no","e"),
    ("cfm","api","Yes"),("api","own"),
    ("own","err","No"),("err","e"),
    ("own","set","Yes"),("set","pay"),
    ("pay","ref","Yes"),("ref","note"),("note","ok"),
    ("pay","nonote","No"),("nonote","ok"),
    ("ok","slot"),("slot","e"),
]))

# 10 --------------------------------------------------------------- patient profile
CHARTS.append(("20_patient_profile", "20. Patient Profile Self-Service Flowchart", [
    ("s","start","Start"),
    ("open","input","Patient opens My Profile"),
    ("get","load","GET /api/patient/profile"),
    ("show","display","Prefill the profile form"),
    ("edit","input","Edit name, mobile, DOB, gender, blood group, address"),
    ("v","decision","Name and 10-digit mobile valid?"),
    ("err","error","Popup: show the failing rule"),
    ("put","load","PUT /api/patient/profile"),
    ("sv","decision","Server validation passes?"),
    ("serr","error","Popup: field errors"),
    ("save","data","Update the patients row"),
    ("ok","action","Success popup \"Profile saved\""),
    ("e","end","End"),
], [
    ("s","open"),("open","get"),("get","show"),("show","edit"),("edit","v"),
    ("v","err","No"),("err","edit"),
    ("v","put","Yes"),("put","sv"),
    ("sv","serr","No"),("serr","edit"),
    ("sv","save","Yes"),("save","ok"),("ok","e"),
]))

# 11 --------------------------------------------------------------- department mgmt
CHARTS.append(("21_department_management", "21. Department Management Flowchart", [
    ("s","start","Start"),
    ("open","input","Admin opens the Departments tab"),
    ("load","load","GET /api/admin/departments"),
    ("list","display","Show departments with doctor counts"),
    ("act","decision","Add / Edit / Delete?"),
    ("form","input","Enter name (3-80) and description"),
    ("v","decision","Valid and name not duplicated?"),
    ("err","error","Popup: fix the form"),
    ("save","data","POST or PUT department"),
    ("chk","decision","Active doctors attached?"),
    ("derr","error","400 - cannot delete, doctors still attached"),
    ("del","data","DELETE department"),
    ("ok","action","Success popup, list reloaded"),
    ("e","end","End"),
], [
    ("s","open"),("open","load"),("load","list"),("list","act"),
    ("act","form","Add / Edit"),("form","v"),
    ("v","err","No"),("err","form"),
    ("v","save","Yes"),("save","ok"),
    ("act","chk","Delete"),
    ("chk","derr","Yes"),("derr","list"),
    ("chk","del","No"),("del","ok"),
    ("ok","e"),
]))

# 12 --------------------------------------------------------------- room mgmt
CHARTS.append(("22_room_management", "22. Room Management Flowchart", [
    ("s","start","Start"),
    ("open","input","Admin opens the Rooms tab"),
    ("load","load","GET /api/admin/rooms"),
    ("list","display","Show rooms (number, type, floor, active)"),
    ("act","decision","Add / Edit / Deactivate?"),
    ("form","input","Enter room number, type, floor"),
    ("v","decision","Format valid and number unique?"),
    ("err","error","Popup: fix the form"),
    ("save","data","POST or PUT room"),
    ("deact","data","Set active = false (soft delete keeps history)"),
    ("ok","action","Success popup, list reloaded"),
    ("use","display","Room appears in booking and approval dropdowns"),
    ("e","end","End"),
], [
    ("s","open"),("open","load"),("load","list"),("list","act"),
    ("act","form","Add / Edit"),("form","v"),
    ("v","err","No"),("err","form"),
    ("v","save","Yes"),("save","ok"),
    ("act","deact","Deactivate"),("deact","ok"),
    ("ok","use"),("use","e"),
]))

# 13 --------------------------------------------------------------- ward status
CHARTS.append(("23_patient_ward_status", "23. Patient Ward Status Flowchart", [
    ("s","start","Start"),
    ("open","input","Admin opens the Patients tab"),
    ("load","load","GET /api/admin/patients"),
    ("auto","decision","Status = ADMITTED and last appointment finished?"),
    ("dis","data","Auto-set status = DISCHARGED"),
    ("list","display","Show list with status pills"),
    ("act","decision","Admit or Discharge?"),
    ("chk","decision","Has an appointment that has not finished?"),
    ("err","error","400 - can only admit against a live appointment"),
    ("adm","data","PATCH status = ADMITTED"),
    ("dch","data","PATCH status = DISCHARGED"),
    ("ok","action","Success popup, list reloaded"),
    ("e","end","End"),
], [
    ("s","open"),("open","load"),("load","auto"),
    ("auto","dis","Yes"),("dis","list"),
    ("auto","list","No"),
    ("list","act"),
    ("act","chk","Admit"),
    ("chk","err","No"),("err","list"),
    ("chk","adm","Yes"),("adm","ok"),
    ("act","dch","Discharge"),("dch","ok"),
    ("ok","e"),
]))

# 14 --------------------------------------------------------------- search + bulk delete
CHARTS.append(("24_search_bulk_delete", "24. Admin Search and Bulk Delete Flowchart", [
    ("s","start","Start"),
    ("tab","input","Admin opens Appointments / Doctors / Patients"),
    ("load","load","Load the rows for that tab"),
    ("crit","input","Enter search criteria (ID, date, specialty or department)"),
    ("filt","action","Filter the loaded rows in the browser"),
    ("any","decision","Any rows match?"),
    ("empty","display","Show \"No records match this search\""),
    ("show","display","Show filtered rows + \"showing X of Y\""),
    ("sel","decision","Rows selected for deletion?"),
    ("cfm","decision","Confirms the dialog?"),
    ("del","load","DELETE ...?ids=1,2,3 (single bulk request)"),
    ("db","data","Delete rows and their dependent records"),
    ("ok","action","Success popup, selection cleared, list reloaded"),
    ("e","end","End"),
], [
    ("s","tab"),("tab","load"),("load","crit"),("crit","filt"),("filt","any"),
    ("any","empty","No"),("empty","crit"),
    ("any","show","Yes"),("show","sel"),
    ("sel","e","No"),
    ("sel","cfm","Yes"),
    ("cfm","show","No"),
    ("cfm","del","Yes"),("del","db"),("db","ok"),("ok","e"),
]))

# 15 --------------------------------------------------------------- error handling
CHARTS.append(("25_error_handling", "25. Validation and Error Handling Flowchart", [
    ("s","start","Start"),
    ("act","input","User submits any form or action"),
    ("cv","decision","Client-side rule fails?"),
    ("cpop","error","Error popup with the exact rule"),
    ("send","load","Request reaches the controller"),
    ("bean","decision","Bean validation fails?"),
    ("f400","error","400 + field error map"),
    ("biz","decision","Business rule fails?"),
    ("kind","decision","Which failure?"),
    ("f404","error","404 ResourceNotFound"),
    ("f409","error","409 Conflict / duplicate"),
    ("f403","error","401 / 403 auth failure"),
    ("f500","error","500 unexpected"),
    ("flat","action","readError() flattens the response into one message"),
    ("pop","display","Error popup shown to the user"),
    ("ok","action","Success popup + refresh the list"),
    ("e","end","End"),
], [
    ("s","act"),("act","cv"),
    ("cv","cpop","Yes"),("cpop","act"),
    ("cv","send","No"),("send","bean"),
    ("bean","f400","Yes"),("f400","flat"),
    ("bean","biz","No"),
    ("biz","kind","Yes"),
    ("kind","f404","Not found"),("kind","f409","Conflict"),
    ("kind","f403","Auth"),("kind","f500","Other"),
    ("f404","flat"),("f409","flat"),("f403","flat"),("f500","flat"),
    ("flat","pop"),("pop","act"),
    ("biz","ok","No"),("ok","e"),
]))

for key, title, nodes, edges in CHARTS:
    build(key, title, nodes, edges)

print("total charts:", len(CHARTS))
