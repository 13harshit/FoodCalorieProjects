import cv2
import numpy as np

# We know area of thumb. It is 5*2.3 cm².
SKIN_MULTIPLIER = 5 * 2.3
PIXEL_TO_CM_MULTIPLIER_CONSTANT = 5.0

density_dict = {
    "Apple": 0.96,
    "Banana": 0.94,
    "Carrot": 0.641,
    "Onion": 0.513,
    "Orange": 0.482,
    "Tomato": 0.481,
    "Qiwi": 0.575,
    "Pizza": 0.28, # Approximate density
}

calorie_dict = {
    "Apple": 52,
    "Banana": 89,
    "Carrot": 41,
    "Onion": 40,
    "Orange": 47,
    "Tomato": 18,
    "Qiwi": 44,
    "Pizza": 266,
}

label_list = ["thumb", "Apple", "Banana", "Orange", "Qiwi", "Tomato", "Carrot", "Onion"]


def getCalorie(label, volume):  # volume in cm^3
    if label not in calorie_dict:
        return 0, 0, 0
    calorie = calorie_dict[label]
    density = density_dict[label]
    mass = volume * density * 1.0
    calorie_tot = (calorie / 100.0) * mass
    return mass, calorie_tot, calorie


def getVolume(label, area, skin_area, pix_to_cm_multiplier, fruit_contour):
    area_fruit = (area / skin_area) * SKIN_MULTIPLIER  # area in cm^2
    volume = 100
    if label in ["Apple", "Orange", "Qiwi", "Tomato", "Onion"]:
        radius = np.sqrt(area_fruit / np.pi)
        volume = (4 / 3) * np.pi * radius * radius * radius

    if label in ["Banana", "Carrot"] and area_fruit > 30:
        fruit_rect = cv2.minAreaRect(fruit_contour)
        height = max(fruit_rect[1]) * pix_to_cm_multiplier
        radius = area_fruit / (2.0 * height)
        volume = np.pi * radius * radius * height

    if label == "Carrot" and area_fruit <= 30:
        volume = area_fruit * 0.5

    return volume


def image_segmentation(cropped_img_name, cropped_img):
    cv2_img_gray = cv2.cvtColor(cropped_img, cv2.COLOR_BGR2GRAY)
    adap_thresh = cv2.adaptiveThreshold(
        cv2_img_gray, 100, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 2
    )

    contours, hierarchy = cv2.findContours(
        adap_thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE
    )

    if not contours:
        return None

    largest_areas = sorted(contours, key=cv2.contourArea)
    mask = np.zeros(cv2_img_gray.shape, np.uint8)
    cv2.drawContours(mask, [largest_areas[-1]], 0, (255, 255, 255, 255), -1)

    img_bitcontour = cv2.bitwise_or(cropped_img, cropped_img, mask=mask)
    hsv_img = cv2.cvtColor(img_bitcontour, cv2.COLOR_BGR2HSV)

    mask_plate = cv2.inRange(hsv_img, np.array([0, 0, 50]), np.array([200, 90, 250]))
    mask_not_plate = cv2.bitwise_not(mask_plate)
    mask_fruit = cv2.bitwise_and(img_bitcontour, img_bitcontour, mask=mask_not_plate)

    img_gray2 = cv2.cvtColor(mask_fruit, cv2.COLOR_BGR2GRAY)
    adap_thresh2 = cv2.adaptiveThreshold(
        img_gray2, 100, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 2
    )
    cont2, _ = cv2.findContours(adap_thresh2, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    if not cont2:
        return None

    largest_areas2 = sorted(cont2, key=cv2.contourArea)
    Thumb_img_min_rectangle = None

    if cropped_img_name.startswith("thumb"):
        req_contour = largest_areas2[-1]
        req_object_area = cv2.contourArea(req_contour)

        rect = cv2.minAreaRect(req_contour)
        pix_height = max(rect[1])
        if pix_height == 0:
            pix_height = 1
        pix_to_cm_multiplier = PIXEL_TO_CM_MULTIPLIER_CONSTANT / pix_height
        result = [req_contour, req_object_area, pix_to_cm_multiplier]

    elif cropped_img_name.startswith("Carrot"):
        # If there are at least two contours, use the second largest as per original logic
        req_contour = largest_areas2[-2] if len(largest_areas2) > 1 else largest_areas2[-1]
        req_object_area = cv2.contourArea(req_contour)
        result = [req_contour, req_object_area]
    else:
        req_contour = largest_areas2[-1]
        req_object_area = cv2.contourArea(req_contour)
        result = [req_contour, req_object_area]

    return {
        "segmented_obj_contour_area_pixel": result
    }


def crop_img(input_img, img_name, bb_cordinate, pixel_margin=5):
    dh, dw, cha = input_img.shape
    xmin, ymin, w, h = bb_cordinate

    p = pixel_margin
    X_MIN = max(0, xmin - p)
    Y_MIN = max(0, ymin - p)
    Y_MAX = min(dh, (ymin + h) + p)
    X_MAX = min(dw, (xmin + w) + p)

    imgCrop = input_img[int(Y_MIN):int(Y_MAX), int(X_MIN):int(X_MAX)]
    return {
        "img_name": img_name,
        "cropped_image": imgCrop,
    }
