import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { FiArrowRight, FiBook, FiLock, FiMail, FiPhone, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { auth, db } from '../backend/firebase';
import './Register.css';

// Hardcoded array of events with closed registrations
const CLOSED_EVENTS = ["Research X", "InnovateX", "RepliCraft", "Cinequery", "Surprise Event"];
// Only "Cinequery" is still open for registration

const NeonPulse = ({ children }) => (
  <motion.h1
    initial={{ opacity: 0.8 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 2, repeat: Infinity }}
    className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent mb-8 text-center"
  >
    {children}
  </motion.h1>
);

const EventPill = ({ children, checked, onChange, name, value, eventType, disabled }) => (
  <motion.label
    whileHover={{ scale: disabled ? 1 : 1.02 }}
    className={`relative block transition-all ${checked ? 'scale-[1.02]' : ''} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
  >
    <input
      type="checkbox"
      name={name}
      value={value}
      checked={checked}
      onChange={(e) => !disabled && onChange(e, eventType)}
      disabled={disabled}
      className="peer absolute opacity-0"
    />
    <div className={`p-4 rounded-lg border-2 ${
      checked
      ? 'border-green-500 bg-green-900/20 shadow-lg shadow-green-500/20'
      : disabled 
        ? 'border-gray-700 bg-gray-900/20'
        : 'border-gray-600 hover:border-green-500'
      } transition-all`}>
      <span className={`text-sm font-medium ${checked ? 'text-green-400' : disabled ? 'text-gray-500' : 'text-gray-300'}`}>
        {children}
      </span>
      {disabled && (
        <div className="mt-1 text-xs text-red-400">Registration closed</div>
      )}
    </div>
  </motion.label>
);

function Register({ onLogin }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    college: '',
    department: '',
    year: '',
    technicalEvents: [],
    nonTechnicalEvents: [],
    paperDetails: '',
    teamNames: {}
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const technicalEvents = [
    "Research X",
    "InnovateX",
    "RepliCraft",
    "Cinequery"
  ];

  const nonTechnicalEvents = [
    "Surprise Event"
  ];

  // Function to check if an event is closed for registration
  const isEventClosed = (eventName) => {
    return CLOSED_EVENTS.includes(eventName);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleEventSelection = (e, eventType) => {
    const { value, checked } = e.target;
    
    // If the event is closed, prevent selection
    if (isEventClosed(value)) {
      toast.error(`Registration for ${value} is closed`, {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }

    const currentTechnical = eventType === 'technicalEvents' ? [...formData.technicalEvents] : formData.technicalEvents;
    const currentNonTechnical = eventType === 'nonTechnicalEvents' ? [...formData.nonTechnicalEvents] : formData.nonTechnicalEvents;

    // Define the exclusive technical events
    const exclusiveTechnicalEvents = ["RepliCraft", "InnovateX", "Cinequery", "Research X"];

    if (checked) {
        const totalSelected = currentTechnical.length + currentNonTechnical.length;

        // Check if the selected event is one of the exclusive events
        if (exclusiveTechnicalEvents.includes(value)) {
            // If it's an exclusive event, uncheck any other exclusive events
            currentTechnical.forEach(event => {
                if (exclusiveTechnicalEvents.includes(event)) {
                    const index = currentTechnical.indexOf(event);
                    if (index > -1) currentTechnical.splice(index, 1);
                }
            });
        }

        if (totalSelected >= 2) {
            e.preventDefault();
            toast.warning('You can only select a maximum of 2 events in total', {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme: "dark",
            });
            return;
        }

        if (eventType === 'technicalEvents') {
            currentTechnical.push(value);
        } else {
            currentNonTechnical.push(value);
        }
    } else {
        if (eventType === 'technicalEvents') {
            const index = currentTechnical.indexOf(value);
            if (index > -1) currentTechnical.splice(index, 1);
            // Clear the team name and paper details when event is unchecked
            const updatedTeamNames = { ...formData.teamNames };
            delete updatedTeamNames[value];
            setFormData(prevState => ({
                ...prevState,
                teamNames: updatedTeamNames,
                paperDetails: value === 'Research X' ? '' : prevState.paperDetails
            }));
        } else {
            const index = currentNonTechnical.indexOf(value);
            if (index > -1) currentNonTechnical.splice(index, 1);
        }
    }

    setFormData(prevState => ({
        ...prevState,
        technicalEvents: currentTechnical,
        nonTechnicalEvents: currentNonTechnical
    }));
  };

  const handleTeamNameChange = (event, eventName) => {
    setFormData(prevState => ({
      ...prevState,
      teamNames: {
        ...prevState.teamNames,
        [eventName]: event.target.value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Check if user has selected any closed events (defensive check)
    const selectedEvents = [...formData.technicalEvents, ...formData.nonTechnicalEvents];
    const hasClosedEvent = selectedEvents.some(event => isEventClosed(event));
    
    if (hasClosedEvent) {
      toast.error('You have selected events that are no longer available for registration', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }

    // Validate all required fields are filled
    const requiredFields = [
      { field: 'name', label: 'Name' },
      { field: 'email', label: 'Email' },
      { field: 'password', label: 'Password' },
      { field: 'confirmPassword', label: 'Confirm Password' },
      { field: 'phone', label: 'Phone Number' },
      { field: 'college', label: 'College Name' },
      { field: 'department', label: 'Department' },
      { field: 'year', label: 'Year of Study' }
    ];

    for (const { field, label } of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        toast.error(`${label} is required`, {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
        return;
      }
    }

    // Validate at least one event is selected
    if (formData.technicalEvents.length === 0 && formData.nonTechnicalEvents.length === 0) {
      toast.error('Please select at least one event', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }

    // Validate password
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }

    // Validate phone number
    if (!/^\d{10}$/.test(formData.phone)) {
      toast.error('Phone number must be exactly 10 digits', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }

    // Validate team names and drive link for selected events
    for (const event of formData.technicalEvents) {
      if (!formData.teamNames[event] || formData.teamNames[event].trim() === '') {
        toast.error(`Team name is required for ${event}`, {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
        return;
      }

      if (event === 'Research X' && (!formData.paperDetails || formData.paperDetails.trim() === '')) {
        toast.error('Drive link is required for Research X', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark",
        });
        return;
      }
    }

    setIsSubmitting(true);

    let user;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      user = userCredential.user;

      if (user) {
        const userDocRef = doc(db, "Users", user.uid);

        await setDoc(userDocRef, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          college: formData.college,
          department: formData.department,
          password: formData.password,
          year: formData.year,
          no_of_events: formData.technicalEvents.length + formData.nonTechnicalEvents.length,
          technicalEvents: formData.technicalEvents,
          nonTechnicalEvents: formData.nonTechnicalEvents,
          paperDetails: formData.paperDetails,
          teamNames: formData.teamNames,
          unique_id: user.uid
        });

        localStorage.setItem('user', JSON.stringify({
          uid: user.uid,
          unique_id: user.uid,
          expires: Date.now() + (3 * 24 * 60 * 60 * 1000)
        }));

        if (onLogin) {
          onLogin(`/user/${user.uid}`);
        }

        toast.success('Registered successfully', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "dark",
        });
      }
    } catch (error) {
      console.error("Error storing data:", error.message);
      toast.error(error.message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
      });
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-900 to-black relative">
      <ToastContainer
        style={{ marginTop: "80px" }} // Adjust this value based on your navbar height
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick={true}
        pauseOnHover={true}
        draggable={true}
        theme="dark"
      />
      {/* Animated Background Elements */}
      <div className="absolute h-full w-full inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(40deg,rgba(0,255,128,0.05)_0%,rgba(0,0,0,0)_50%,rgba(0,255,128,0.05)_100%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,128,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,128,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,128,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      </div>

      <div className="relative h-full z-10 container mx-auto py-4 flex flex-col">
        <NeonPulse>Cybernautix '25 Registration</NeonPulse>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 lg:max-w-3xl w-full mx-auto bg-black/40 backdrop-blur-lg rounded-xl shadow-2xl p-8 border space-y-8 border-green-500/30 overflow-y-auto scrollbar-hide"
        >
          {/* Event Closed Alert */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm"
          >
            <div className="font-bold mb-1">Important Notice</div>
            <div>Registration for all events are now closed due to filled slots.</div>
          </motion.div>

          {/* Error Message */}
          {formError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm"
            >
              {formError}
            </motion.div>
          )}

          {/* Personal Info Section */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="border-l-4 border-green-500 pl-4">
              <h2 className="text-xl font-semibold text-green-400">Personal Details</h2>
              <p className="text-sm text-gray-400 mt-1">All fields are required</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: FiUser, name: 'name', placeholder: 'Full Name', type: 'text' },
                { icon: FiMail, name: 'email', placeholder: 'Email Address', type: 'email' },
                { icon: FiLock, name: 'password', placeholder: 'Password', type: 'password' },
                { icon: FiLock, name: 'confirmPassword', placeholder: 'Confirm Password', type: 'password' },
                { icon: FiPhone, name: 'phone', placeholder: 'Phone Number (10 digits)', type: 'tel' },
              ].map((field, idx) => (
                <div key={field.name} className="relative">
                  <field.icon className="absolute top-3 left-3 text-green-500" />
                  <input
                    type={field.type}
                    name={field.name}
                    placeholder={field.placeholder}
                    required
                    value={formData[field.name]}
                    onChange={field.name === 'phone'
                      ? (e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        handleChange({ target: { name: field.name, value } });
                      }
                      : handleChange
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-black/30 rounded-lg !border !border-gray-700 focus:!border-green-500 focus:ring-1 focus:ring-green-500/50 text-gray-100 placeholder-gray-500 transition-all"
                  />
                </div>
              ))}
            </div>
          </motion.div>

          {/* College Info Section */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="border-l-4 border-green-500 pl-4">
              <h2 className="text-xl font-semibold text-green-400">College Information</h2>
              <p className="text-sm text-gray-400 mt-1">Your academic details</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: FiBook, name: 'college', placeholder: 'College Name' },
                { icon: FiBook, name: 'department', placeholder: 'Department' },
                { icon: FiBook, name: 'year', placeholder: 'Year of Study' },
              ].map((field) => (
                <div key={field.name} className="relative">
                  <field.icon className="absolute top-3 left-3 text-green-500" />
                  <input
                    {...field}
                    type="text"
                    required
                    value={formData[field.name]}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-black/30 rounded-lg !border !border-gray-700 focus:!border-green-500 focus:ring-1 focus:ring-green-500/50 text-gray-100 placeholder-gray-500 transition-all"
                  />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Event Selection */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="border-l-4 border-green-500 pl-4">
              <h2 className="text-xl font-semibold text-green-400">Event Selection</h2>
              <p className="text-sm text-gray-400 mt-1">Choose up to 2 events</p>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-green-400">Technical Events <span className='text-zinc-400 text-sm'>(Only 1 Technical Event Allowed due to time constraints)</span> </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {technicalEvents.map(event => (
                    <div key={event} className="space-y-2">
                      <EventPill
                        name="technicalEvents"
                        value={event}
                        checked={formData.technicalEvents.includes(event)}
                        onChange={handleEventSelection}
                        eventType="technicalEvents"
                        disabled={isEventClosed(event)}
                      >
                        {event}
                      </EventPill>
                      {formData.technicalEvents.includes(event) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-2"
                        >
                          <input
                            type="text"
                            placeholder="Team Name"
                            value={formData.teamNames[event] || ''}
                            onChange={(e) => handleTeamNameChange(e, event)}
                            className="w-full px-4 py-2.5 bg-black/30 rounded-lg !border !border-gray-700 focus:!border-green-500 focus:ring-1 focus:ring-green-500/50 text-gray-100 placeholder-gray-500 transition-all"
                          />
                          {event === 'Research X' && (
                            <input
                              type="text"
                              placeholder="Upload abstract drive link"
                              value={formData.paperDetails || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, paperDetails: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-black/30 rounded-lg !border !border-gray-700 focus:!border-green-500 focus:ring-1 focus:ring-green-500/50 text-gray-100 placeholder-gray-500 transition-all placeholder:text-sm sm:placeholder:text-base"
                            />
                          )}
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-green-400">Extra</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {nonTechnicalEvents.map(event => (
                    <EventPill
                      key={event}
                      name="nonTechnicalEvents"
                      value={event}
                      checked={formData.nonTechnicalEvents.includes(event)}
                      onChange={handleEventSelection}
                      eventType="nonTechnicalEvents"
                      disabled={isEventClosed(event)}
                    >
                      {event}
                    </EventPill>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg font-semibold text-white relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer" />
            <span className="relative flex items-center justify-center gap-2">
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full"
                />
              ) : (
                <>
                  Complete Registration
                  <FiArrowRight className="w-4 h-4" />
                </>
              )}
            </span>
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
}

export default Register;